import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { CATEGORY_LABELS } from '../game/constants'
import {
  calculateCategoryScore,
  canUseJokerValue,
  countFilled,
  createEmptyScorecard,
  getTurnContext,
  rollDie,
} from '../game/rules'
import { getFirebaseContext } from './firebase'
import type {
  Category,
  JokerMode,
  OnlineParticipant,
  OnlineRoomDoc,
  OnlineRoomState,
  PlayerState,
} from '../game/types'

const ROOMS_COLLECTION = 'rooms'

function roomRef(roomCode: string) {
  const { db } = getFirebaseContext()
  return doc(db, ROOMS_COLLECTION, roomCode.toUpperCase())
}

function makeRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

function makePlayer(name: string, avatar: string): PlayerState {
  return {
    name,
    avatar,
    scorecard: createEmptyScorecard(),
    yahtzeeBonusCount: 0,
  }
}

function makeParticipant(id: string, name: string, avatar: string): OnlineParticipant {
  return {
    id,
    name,
    avatar,
    connected: true,
    lastSeen: Date.now(),
  }
}

function emptyOnlineState(
  hostName: string,
  hostAvatar: string,
  jokerMode: JokerMode,
  maxPlayers: number,
  hostPlayerId: string,
): OnlineRoomState {
  return {
    players: [makePlayer(hostName, hostAvatar)],
    playerIds: [hostPlayerId],
    maxPlayers,
    currentPlayer: 0,
    dice: [1, 1, 1, 1, 1],
    held: [false, false, false, false, false],
    rollsUsed: 0,
    jokerMode,
    statusMessage: 'Room created. Share the code. Need at least 2 players to start.',
    started: false,
    gameOver: false,
  }
}

function ensureTurn(room: OnlineRoomDoc, playerId: string) {
  return room.state.playerIds[room.state.currentPlayer] === playerId
}

function clonePlayers(players: PlayerState[]) {
  return players.map((player) => ({
    ...player,
    scorecard: { ...player.scorecard },
  }))
}

function computeGameOver(players: PlayerState[]) {
  return players.every((player) => countFilled(player.scorecard) === 13)
}

export interface CreateRoomResult {
  roomCode: string
  playerId: string
}

export async function createRoom(
  hostName: string,
  hostAvatar: string,
  jokerMode: JokerMode,
  maxPlayersInput = 2,
): Promise<CreateRoomResult> {
  const playerId = crypto.randomUUID()
  const maxPlayers = Math.max(2, Math.min(6, maxPlayersInput))

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const roomCode = makeRoomCode()
    const ref = roomRef(roomCode)
    const existing = await getDoc(ref)
    if (existing.exists()) {
      continue
    }

    const state = emptyOnlineState(hostName, hostAvatar, jokerMode, maxPlayers, playerId)

    const docData: OnlineRoomDoc = {
      roomCode,
      hostId: playerId,
      updatedAt: Date.now(),
      state,
      participants: {
        [playerId]: makeParticipant(playerId, hostName, hostAvatar),
      },
    }

    await setDoc(ref, {
      ...docData,
      createdAt: serverTimestamp(),
      serverUpdatedAt: serverTimestamp(),
    })

    return { roomCode, playerId }
  }

  throw new Error('Unable to create room. Please try again.')
}

export interface JoinRoomResult {
  roomCode: string
  playerId: string
}

export async function joinRoom(
  roomCodeInput: string,
  name: string,
  avatar: string,
): Promise<JoinRoomResult> {
  const roomCode = roomCodeInput.trim().toUpperCase()
  const playerId = crypto.randomUUID()
  const ref = roomRef(roomCode)

  await runTransaction(getFirebaseContext().db, async (transaction) => {
    const snapshot = await transaction.get(ref)
    if (!snapshot.exists()) {
      throw new Error('Room not found.')
    }

    const room = snapshot.data() as OnlineRoomDoc
    if (room.state.started) {
      throw new Error('Game already started. Ask host to reset room before joining.')
    }
    if (room.state.playerIds.length >= room.state.maxPlayers) {
      throw new Error('Room is full.')
    }

    const state = { ...room.state }
    state.players = [...clonePlayers(state.players), makePlayer(name, avatar)]
    state.playerIds = [...state.playerIds, playerId]
    state.statusMessage = `${name} joined. ${state.players.length}/${state.maxPlayers} players in lobby.`

    const participants = {
      ...room.participants,
      [playerId]: makeParticipant(playerId, name, avatar),
    }

    transaction.update(ref, {
      state,
      participants,
      updatedAt: Date.now(),
      serverUpdatedAt: serverTimestamp(),
    })
  })

  return { roomCode, playerId }
}

export function subscribeRoom(roomCode: string, onData: (room: OnlineRoomDoc | null) => void): Unsubscribe {
  const ref = roomRef(roomCode)
  return onSnapshot(ref, (snapshot) => {
    if (!snapshot.exists()) {
      onData(null)
      return
    }
    onData(snapshot.data() as OnlineRoomDoc)
  })
}

export async function updatePresence(roomCode: string, playerId: string, connected: boolean) {
  const ref = roomRef(roomCode)
  await updateDoc(ref, {
    [`participants.${playerId}.connected`]: connected,
    [`participants.${playerId}.lastSeen`]: Date.now(),
    updatedAt: Date.now(),
    serverUpdatedAt: serverTimestamp(),
  })
}

export async function updateProfile(roomCode: string, playerId: string, name: string, avatar: string) {
  const ref = roomRef(roomCode)

  await runTransaction(getFirebaseContext().db, async (transaction) => {
    const snapshot = await transaction.get(ref)
    if (!snapshot.exists()) {
      return
    }

    const room = snapshot.data() as OnlineRoomDoc
    const idx = room.state.playerIds.indexOf(playerId)
    if (idx < 0) {
      return
    }

    const state = { ...room.state, players: clonePlayers(room.state.players) }
    state.players[idx].name = name
    state.players[idx].avatar = avatar

    transaction.update(ref, {
      state,
      [`participants.${playerId}.name`]: name,
      [`participants.${playerId}.avatar`]: avatar,
      [`participants.${playerId}.lastSeen`]: Date.now(),
      updatedAt: Date.now(),
      serverUpdatedAt: serverTimestamp(),
    })
  })
}

export async function resetRoomGame(roomCode: string, hostPlayerId: string, jokerMode: JokerMode) {
  const ref = roomRef(roomCode)

  await runTransaction(getFirebaseContext().db, async (transaction) => {
    const snapshot = await transaction.get(ref)
    if (!snapshot.exists()) {
      throw new Error('Room not found.')
    }

    const room = snapshot.data() as OnlineRoomDoc
    if (room.hostId !== hostPlayerId) {
      throw new Error('Only the host can reset/start the room game.')
    }

    const state = { ...room.state }
    if (state.playerIds.length < 2) {
      throw new Error('Need at least 2 players in lobby to start.')
    }

    state.players = state.players.map((player) => ({
      ...player,
      scorecard: createEmptyScorecard(),
      yahtzeeBonusCount: 0,
    }))
    state.currentPlayer = 0
    state.dice = [1, 1, 1, 1, 1]
    state.held = [false, false, false, false, false]
    state.rollsUsed = 0
    state.jokerMode = jokerMode
    state.gameOver = false
    state.started = true
    state.statusMessage = `${state.players[0].name} starts. Game ready for ${state.players.length} players.`

    transaction.update(ref, {
      state,
      updatedAt: Date.now(),
      serverUpdatedAt: serverTimestamp(),
    })
  })
}

export async function toggleHoldOnline(roomCode: string, playerId: string, dieIndex: number) {
  const ref = roomRef(roomCode)

  await runTransaction(getFirebaseContext().db, async (transaction) => {
    const snapshot = await transaction.get(ref)
    if (!snapshot.exists()) {
      throw new Error('Room not found.')
    }

    const room = snapshot.data() as OnlineRoomDoc
    if (!room.state.started || room.state.gameOver || !ensureTurn(room, playerId) || room.state.rollsUsed === 0) {
      return
    }

    const held = [...room.state.held]
    if (dieIndex < 0 || dieIndex >= held.length) {
      return
    }

    held[dieIndex] = !held[dieIndex]

    transaction.update(ref, {
      'state.held': held,
      updatedAt: Date.now(),
      serverUpdatedAt: serverTimestamp(),
    })
  })
}

export async function rollOnline(roomCode: string, playerId: string) {
  const ref = roomRef(roomCode)

  await runTransaction(getFirebaseContext().db, async (transaction) => {
    const snapshot = await transaction.get(ref)
    if (!snapshot.exists()) {
      throw new Error('Room not found.')
    }

    const room = snapshot.data() as OnlineRoomDoc
    if (!room.state.started || room.state.gameOver || !ensureTurn(room, playerId) || room.state.rollsUsed >= 3) {
      return
    }

    const nextDice = room.state.dice.map((value, index) => (room.state.held[index] ? value : rollDie()))
    const nextRollsUsed = room.state.rollsUsed + 1
    const playerName = room.state.players[room.state.currentPlayer]?.name ?? 'Player'

    transaction.update(ref, {
      'state.dice': nextDice,
      'state.rollsUsed': nextRollsUsed,
      'state.statusMessage': `${playerName} rolled. Choose dice to hold or score a category.`,
      updatedAt: Date.now(),
      serverUpdatedAt: serverTimestamp(),
    })
  })
}

export async function scoreOnline(roomCode: string, playerId: string, category: Category) {
  const ref = roomRef(roomCode)

  await runTransaction(getFirebaseContext().db, async (transaction) => {
    const snapshot = await transaction.get(ref)
    if (!snapshot.exists()) {
      throw new Error('Room not found.')
    }

    const room = snapshot.data() as OnlineRoomDoc
    const state = room.state

    if (!state.started || state.gameOver || !ensureTurn(room, playerId) || state.rollsUsed === 0) {
      return
    }

    const activeIndex = state.currentPlayer
    const activePlayer = state.players[activeIndex]
    if (activePlayer.scorecard[category] !== null) {
      return
    }

    const turnContext = getTurnContext(activePlayer, state.dice, state.jokerMode)
    if (!turnContext.allowed.has(category)) {
      return
    }

    const score = calculateCategoryScore(category, state.dice, {
      jokerForStraightsAndFullHouse: canUseJokerValue(category, turnContext),
    })
    const extraYahtzeeBonus = turnContext.isExtraYahtzee && turnContext.canAwardYahtzeeBonus ? 1 : 0

    const players = clonePlayers(state.players)
    players[activeIndex].scorecard[category] = score
    players[activeIndex].yahtzeeBonusCount += extraYahtzeeBonus

    const gameOver = computeGameOver(players)
    const nextPlayer = gameOver ? activeIndex : (activeIndex + 1) % players.length
    const bonusText = extraYahtzeeBonus > 0 ? ' High Five bonus +100!' : ''

    const statusMessage = gameOver
      ? 'Game complete. Check totals below to see the winner.'
      : `${players[activeIndex].name} scored ${score} in ${CATEGORY_LABELS[category]}.${bonusText} ${players[nextPlayer].name}, your turn.`

    transaction.update(ref, {
      'state.players': players,
      'state.currentPlayer': nextPlayer,
      'state.dice': [1, 1, 1, 1, 1],
      'state.held': [false, false, false, false, false],
      'state.rollsUsed': 0,
      'state.gameOver': gameOver,
      'state.statusMessage': statusMessage,
      updatedAt: Date.now(),
      serverUpdatedAt: serverTimestamp(),
    })
  })
}
