import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import './styles/AppLayout.css'
import DiceRow from './components/DiceRow'
import GameHeader from './components/GameHeader'
import MatchHistoryPanel from './components/MatchHistoryPanel'
import ScorecardTable from './components/ScorecardTable'
import TotalsPanel from './components/TotalsPanel'
import { CATEGORY_LABELS } from './game/constants'
import { buildAiHoldMask, chooseAiCategory } from './game/ai'
import {
  exportHistoryJson,
  importHistoryJson,
  loadPersistedState,
  savePersistedState,
} from './game/persistence'
import {
  calculateCategoryScore,
  canUseJokerValue,
  computeTotals,
  countFilled,
  createPlayers,
  getTurnContext,
  rollDie,
} from './game/rules'
import type {
  AiDifficulty,
  Category,
  GameMode,
  JokerMode,
  MatchHistoryEntry,
  OnlineRoomDoc,
  PlayerState,
} from './game/types'

const ONLINE_SESSION_KEY = 'yacht-online-session-v1'

type OnlineModule = typeof import('./online/roomService')
let onlineModulePromise: Promise<OnlineModule> | null = null

async function loadOnlineModule() {
  if (!onlineModulePromise) {
    onlineModulePromise = import('./online/roomService')
  }
  return onlineModulePromise
}

interface OnlineSession {
  roomCode: string
  playerId: string
}

function readOnlineSession() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(ONLINE_SESSION_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as OnlineSession
    if (!parsed.roomCode || !parsed.playerId) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeOnlineSession(session: OnlineSession | null) {
  if (typeof window === 'undefined') {
    return
  }

  if (!session) {
    window.localStorage.removeItem(ONLINE_SESSION_KEY)
    return
  }

  window.localStorage.setItem(ONLINE_SESSION_KEY, JSON.stringify(session))
}

function fallbackPlayer(): PlayerState {
  return {
    name: 'Player',
    avatar: '🎲',
    scorecard: createPlayers(1, 'hotseat')[0].scorecard,
    yahtzeeBonusCount: 0,
  }
}

function App() {
  const initial = useMemo(() => loadPersistedState(), [])

  const [playerCount, setPlayerCount] = useState(initial.playerCount)
  const [players, setPlayers] = useState<PlayerState[]>(initial.players)
  const [currentPlayer, setCurrentPlayer] = useState(initial.currentPlayer)
  const [dice, setDice] = useState<number[]>(initial.dice)
  const [held, setHeld] = useState<boolean[]>(initial.held)
  const [rollsUsed, setRollsUsed] = useState(initial.rollsUsed)
  const [jokerMode, setJokerMode] = useState<JokerMode>(initial.jokerMode)
  const [gameMode, setGameMode] = useState<GameMode>(initial.gameMode)
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>(initial.aiDifficulty)
  const [statusMessage, setStatusMessage] = useState(initial.statusMessage)
  const [history, setHistory] = useState<MatchHistoryEntry[]>(initial.history)

  const [onlineSession, setOnlineSession] = useState<OnlineSession | null>(() => readOnlineSession())
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoomDoc | null>(null)
  const [onlineRoomCodeInput, setOnlineRoomCodeInput] = useState('')
  const [onlineError, setOnlineError] = useState('')
  const [onlineReady, setOnlineReady] = useState(false)
  const [rollFxTick, setRollFxTick] = useState(0)

  const gameOverLoggedRef = useRef(false)
  const importFileRef = useRef<HTMLInputElement | null>(null)
  const previousRollsUsedRef = useRef(0)

  const effectivePlayers = gameMode === 'online' && onlineRoom ? onlineRoom.state.players : players
  const effectiveCurrentPlayer =
    gameMode === 'online' && onlineRoom ? onlineRoom.state.currentPlayer : currentPlayer
  const effectiveDice = gameMode === 'online' && onlineRoom ? onlineRoom.state.dice : dice
  const effectiveHeld = gameMode === 'online' && onlineRoom ? onlineRoom.state.held : held
  const effectiveRollsUsed = gameMode === 'online' && onlineRoom ? onlineRoom.state.rollsUsed : rollsUsed
  const effectiveJokerMode = gameMode === 'online' && onlineRoom ? onlineRoom.state.jokerMode : jokerMode
  const effectiveStatusMessage =
    gameMode === 'online' && onlineRoom ? onlineRoom.state.statusMessage : statusMessage

  const activePlayer =
    effectivePlayers[effectiveCurrentPlayer] ?? effectivePlayers[0] ?? fallbackPlayer()

  const hasRolled = effectiveRollsUsed > 0
  const isAiTurn = gameMode === 'vsAi' && effectiveCurrentPlayer === 1
  const gameOver =
    (gameMode === 'online' && onlineRoom ? onlineRoom.state.gameOver : false) ||
    effectivePlayers.every((player) => countFilled(player.scorecard) === 13)
  const currentRound = Math.min(13, countFilled(activePlayer.scorecard) + 1)

  const turnContext = useMemo(
    () => getTurnContext(activePlayer, effectiveDice, effectiveJokerMode),
    [activePlayer, effectiveDice, effectiveJokerMode],
  )

  const isMyOnlineTurn =
    gameMode === 'online' &&
    onlineRoom &&
    onlineSession &&
    onlineRoom.state.playerIds[onlineRoom.state.currentPlayer] === onlineSession.playerId

  const myOnlinePlayerIndex =
    gameMode === 'online' && onlineRoom && onlineSession
      ? onlineRoom.state.playerIds.indexOf(onlineSession.playerId)
      : -1

  const participants =
    gameMode === 'online' && onlineRoom
      ? onlineRoom.state.playerIds.map((id, index) => ({
          id,
          player: onlineRoom.state.players[index],
          presence: onlineRoom.participants[id],
        }))
      : []

  function startNewGame(mode = gameMode, nextPlayerCount = playerCount) {
    if (mode === 'online') {
      if (!onlineSession || !onlineRoom) {
        setOnlineError('Create or join a room first.')
        return
      }

      loadOnlineModule()
        .then((online) =>
          online.resetRoomGame(onlineSession.roomCode, onlineSession.playerId, jokerMode),
        )
        .catch((error) => {
          setOnlineError(error instanceof Error ? error.message : 'Unable to reset online game.')
        })
      return
    }

    const safeMode: GameMode = mode
    const safeCount = safeMode === 'vsAi' ? 2 : Math.max(1, Math.min(6, nextPlayerCount))

    setGameMode(safeMode)
    setPlayerCount(safeCount)
    setPlayers(createPlayers(safeCount, safeMode))
    setCurrentPlayer(0)
    setDice([1, 1, 1, 1, 1])
    setHeld([false, false, false, false, false])
    setRollsUsed(0)
    setStatusMessage(
      safeMode === 'vsAi'
        ? 'New game started. You go first.'
        : 'New game started. Player 1, roll when ready.',
    )
    gameOverLoggedRef.current = false
  }

  function updatePlayerName(index: number, value: string) {
    const nextName = value.slice(0, 24) || `Player ${index + 1}`

    setPlayers((previous) =>
      previous.map((player, i) => (i === index ? { ...player, name: nextName } : player)),
    )

    if (gameMode === 'online' && onlineSession && index === myOnlinePlayerIndex) {
      const nextAvatar = effectivePlayers[index]?.avatar || players[index]?.avatar || '🎲'
      loadOnlineModule()
        .then((online) =>
          online.updateProfile(onlineSession.roomCode, onlineSession.playerId, nextName, nextAvatar),
        )
        .catch(() => {
          setOnlineError('Could not sync profile update.')
        })
    }
  }

  function updatePlayerAvatar(index: number, value: string) {
    const nextAvatar = value.slice(0, 2) || '🎲'

    setPlayers((previous) =>
      previous.map((player, i) => (i === index ? { ...player, avatar: nextAvatar } : player)),
    )

    if (gameMode === 'online' && onlineSession && index === myOnlinePlayerIndex) {
      const nextName = effectivePlayers[index]?.name || players[index]?.name || 'Player'
      loadOnlineModule()
        .then((online) =>
          online.updateProfile(onlineSession.roomCode, onlineSession.playerId, nextName, nextAvatar),
        )
        .catch(() => {
          setOnlineError('Could not sync profile update.')
        })
    }
  }

  function performLocalRoll(holdMask?: boolean[]) {
    if (gameOver || rollsUsed >= 3) {
      return
    }

    const nextDice = dice.map((value, index) => {
      const keep = holdMask ? holdMask[index] : held[index]
      return keep ? value : rollDie()
    })

    if (holdMask) {
      setHeld([...holdMask])
    }
    setDice(nextDice)
    setRollsUsed((previous) => previous + 1)
    setStatusMessage(`${activePlayer.name} rolled. Choose dice to hold or score a category.`)
  }

  function rollDice() {
    if (gameMode === 'online') {
      if (!onlineSession || !onlineRoom || !isMyOnlineTurn) {
        return
      }

      loadOnlineModule()
        .then((online) => online.rollOnline(onlineSession.roomCode, onlineSession.playerId))
        .catch((error) => {
          setOnlineError(error instanceof Error ? error.message : 'Roll failed.')
        })
      return
    }

    performLocalRoll()
  }

  function toggleHold(index: number) {
    if (gameMode === 'online') {
      if (!onlineSession || !onlineRoom || !isMyOnlineTurn) {
        return
      }
      loadOnlineModule()
        .then((online) =>
          online.toggleHoldOnline(onlineSession.roomCode, onlineSession.playerId, index),
        )
        .catch((error) => {
          setOnlineError(error instanceof Error ? error.message : 'Hold toggle failed.')
        })
      return
    }

    if (gameOver || !hasRolled || isAiTurn) {
      return
    }
    setHeld((previous) => previous.map((isHeld, i) => (i === index ? !isHeld : isHeld)))
  }

  function scoreCategory(category: Category) {
    if (gameMode === 'online') {
      if (!onlineSession || !onlineRoom || !isMyOnlineTurn) {
        return
      }
      loadOnlineModule()
        .then((online) => online.scoreOnline(onlineSession.roomCode, onlineSession.playerId, category))
        .catch((error) => {
          setOnlineError(error instanceof Error ? error.message : 'Scoring failed.')
        })
      return
    }

    if (gameOver || !hasRolled || activePlayer.scorecard[category] !== null) {
      return
    }

    if (!turnContext.allowed.has(category)) {
      setStatusMessage(turnContext.guidance)
      return
    }

    const score = calculateCategoryScore(category, dice, {
      jokerForStraightsAndFullHouse: canUseJokerValue(category, turnContext),
    })

    const extraYahtzeeBonus = turnContext.isExtraYahtzee && turnContext.canAwardYahtzeeBonus ? 1 : 0

    const updatedPlayers = players.map((player, index) => {
      if (index !== currentPlayer) {
        return player
      }

      return {
        ...player,
        scorecard: {
          ...player.scorecard,
          [category]: score,
        },
        yahtzeeBonusCount: player.yahtzeeBonusCount + extraYahtzeeBonus,
      }
    })

    const allDone = updatedPlayers.every((player) => countFilled(player.scorecard) === 13)
    setPlayers(updatedPlayers)

    if (allDone) {
      setStatusMessage('Game complete. Check totals below to see the winner.')
    } else {
      const nextPlayer = (currentPlayer + 1) % players.length
      setCurrentPlayer(nextPlayer)
      const bonusText = extraYahtzeeBonus > 0 ? ' High Five bonus +100!' : ''
      setStatusMessage(
        `${activePlayer.name} scored ${score} in ${CATEGORY_LABELS[category]}.${bonusText} ${updatedPlayers[nextPlayer].name}, your turn.`,
      )
    }

    setDice([1, 1, 1, 1, 1])
    setHeld([false, false, false, false, false])
    setRollsUsed(0)
  }

  async function createOnlineRoomAction() {
    try {
      setOnlineError('')
      const localPlayer = players[0] ?? createPlayers(1, 'hotseat')[0]
      const online = await loadOnlineModule()
      const result = await online.createRoom(
        localPlayer.name,
        localPlayer.avatar,
        jokerMode,
        Math.max(2, Math.min(6, playerCount)),
      )
      setOnlineSession(result)
      writeOnlineSession(result)
      setOnlineRoomCodeInput(result.roomCode)
      setGameMode('online')
      setOnlineReady(true)
      setStatusMessage(`Room ${result.roomCode} created. Share it with friends.`)
    } catch (error) {
      setOnlineReady(false)
      setOnlineError(error instanceof Error ? error.message : 'Unable to create room.')
    }
  }

  async function joinOnlineRoomAction() {
    try {
      setOnlineError('')
      if (!onlineRoomCodeInput.trim()) {
        setOnlineError('Enter a room code first.')
        return
      }

      const localPlayer = players[0] ?? createPlayers(1, 'hotseat')[0]
      const online = await loadOnlineModule()
      const result = await online.joinRoom(onlineRoomCodeInput, localPlayer.name, localPlayer.avatar)
      setOnlineSession(result)
      writeOnlineSession(result)
      setGameMode('online')
      setOnlineReady(true)
      setStatusMessage(`Joined room ${result.roomCode}.`)
    } catch (error) {
      setOnlineReady(false)
      setOnlineError(error instanceof Error ? error.message : 'Unable to join room.')
    }
  }

  async function leaveOnlineRoomAction() {
    if (!onlineSession) {
      return
    }

    try {
      const online = await loadOnlineModule()
      await online.updatePresence(onlineSession.roomCode, onlineSession.playerId, false)
    } catch {
      // Best effort only.
    }

    setOnlineSession(null)
    setOnlineRoom(null)
    setOnlineRoomCodeInput('')
    setOnlineError('')
    writeOnlineSession(null)
    setGameMode('hotseat')
    setStatusMessage('Left online room.')
  }

  function exportHistory() {
    exportHistoryJson(history)
  }

  function requestImportHistory() {
    importFileRef.current?.click()
  }

  async function importHistory(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    try {
      const sanitized = await importHistoryJson(file)
      if (sanitized.length === 0) {
        setStatusMessage('Import failed: no valid match history entries found in file.')
        return
      }

      setHistory(sanitized.slice(0, 20))
      setStatusMessage(`Imported ${sanitized.length} history entries.`)
    } catch {
      setStatusMessage('Import failed: invalid JSON file.')
    }
  }

  const rankings = [...effectivePlayers]
    .map((player) => ({ player, total: computeTotals(player).grandTotal }))
    .sort((a, b) => b.total - a.total)

  useEffect(() => {
    if (effectiveRollsUsed > previousRollsUsedRef.current) {
      setRollFxTick((previous) => previous + 1)
    }
    previousRollsUsedRef.current = effectiveRollsUsed
  }, [effectiveRollsUsed])

  useEffect(() => {
    savePersistedState({
      playerCount,
      players,
      currentPlayer,
      dice,
      held,
      rollsUsed,
      jokerMode,
      gameMode,
      aiDifficulty,
      statusMessage,
      history,
    })
  }, [
    playerCount,
    players,
    currentPlayer,
    dice,
    held,
    rollsUsed,
    jokerMode,
    gameMode,
    aiDifficulty,
    statusMessage,
    history,
  ])

  useEffect(() => {
    if (!onlineSession || gameMode !== 'online') {
      return
    }

    let unsubscribe: (() => void) | undefined
    let cancelled = false

    loadOnlineModule()
      .then((online) => {
        if (cancelled) {
          return
        }

        setOnlineReady(true)
        setOnlineRoomCodeInput(onlineSession.roomCode)
        unsubscribe = online.subscribeRoom(onlineSession.roomCode, (room) => {
          if (!room) {
            setOnlineError('Room no longer exists.')
            return
          }
          setOnlineRoom(room)
        })

        online.updatePresence(onlineSession.roomCode, onlineSession.playerId, true).catch(() => {
          setOnlineError('Could not update online presence.')
        })
      })
      .catch((error) => {
        setOnlineReady(false)
        setOnlineError(error instanceof Error ? error.message : 'Online module failed to load.')
      })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [onlineSession, gameMode])

  useEffect(() => {
    if (!onlineSession || gameMode !== 'online') {
      return
    }

    let disposed = false
    let onUnload: (() => void) | null = null
    let pingId: number | null = null

    loadOnlineModule()
      .then((online) => {
        if (disposed) {
          return
        }

        pingId = window.setInterval(() => {
          online.updatePresence(onlineSession.roomCode, onlineSession.playerId, true).catch(() => {
            // Best effort heartbeat.
          })
        }, 12000)

        onUnload = () => {
          online.updatePresence(onlineSession.roomCode, onlineSession.playerId, false).catch(() => {
            // Best effort only.
          })
        }
        window.addEventListener('beforeunload', onUnload)
      })
      .catch(() => {
        // Ignore in heartbeat path.
      })

    return () => {
      disposed = true
      if (pingId) {
        window.clearInterval(pingId)
      }
      if (onUnload) {
        window.removeEventListener('beforeunload', onUnload)
      }
    }
  }, [onlineSession, gameMode])

  useEffect(() => {
    if (!gameOver || gameOverLoggedRef.current) {
      return
    }

    const scores = effectivePlayers
      .map((player) => ({ name: player.name, total: computeTotals(player).grandTotal }))
      .sort((a, b) => b.total - a.total)
    const topScore = scores[0]?.total ?? 0
    const winners = scores.filter((entry) => entry.total === topScore).map((entry) => entry.name)

    const entry: MatchHistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      playedAtIso: new Date().toISOString(),
      gameMode,
      jokerMode: effectiveJokerMode,
      winners,
      scores,
    }

    setHistory((previous) => [entry, ...previous].slice(0, 20))
    gameOverLoggedRef.current = true
  }, [gameOver, effectivePlayers, gameMode, effectiveJokerMode])

  useEffect(() => {
    if (!isAiTurn || gameOver || gameMode !== 'vsAi') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      if (rollsUsed < 3) {
        const aiHoldMask =
          rollsUsed === 0 ? [false, false, false, false, false] : buildAiHoldMask(dice, aiDifficulty)
        performLocalRoll(aiHoldMask)
        return
      }

      const chosen = chooseAiCategory([...turnContext.allowed], dice, turnContext, aiDifficulty)
      if (chosen) {
        scoreCategory(chosen)
      }
    }, 650)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isAiTurn, gameOver, rollsUsed, dice, turnContext, aiDifficulty, gameMode])

  return (
    <main className="app-shell">
      <GameHeader
        players={gameMode === 'online' && onlineRoom ? onlineRoom.state.players : players}
        gameMode={gameMode}
        playerCount={playerCount}
        jokerMode={jokerMode}
        aiDifficulty={aiDifficulty}
        onGameModeChange={setGameMode}
        onPlayerCountChange={setPlayerCount}
        onJokerModeChange={setJokerMode}
        onAiDifficultyChange={setAiDifficulty}
        onNewGame={() => startNewGame(gameMode, playerCount)}
        onPlayerNameChange={updatePlayerName}
        onPlayerAvatarChange={updatePlayerAvatar}
      />

      {gameMode === 'online' ? (
        <section className="online-panel">
          <h2>Online Room</h2>
          <div className="online-controls">
            <label>
              Room Code
              <input
                value={onlineRoomCodeInput}
                onChange={(event) => setOnlineRoomCodeInput(event.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
              />
            </label>
            <button type="button" onClick={createOnlineRoomAction}>
              Create Room ({Math.max(2, Math.min(6, playerCount))} players)
            </button>
            <button type="button" onClick={joinOnlineRoomAction}>
              Join Room
            </button>
            <button type="button" onClick={leaveOnlineRoomAction} disabled={!onlineSession}>
              Leave Room
            </button>
          </div>

          {onlineSession ? (
            <p>
              Connected as {onlineSession.playerId.slice(0, 8)} in room {onlineSession.roomCode}.
            </p>
          ) : null}

          {onlineRoom ? (
            <p>
              Lobby: {onlineRoom.state.players.length}/{onlineRoom.state.maxPlayers} players ·{' '}
              {onlineRoom.state.started ? 'Game started' : 'Waiting in lobby'}
            </p>
          ) : (
            <p>{onlineReady ? 'Create or join a room to start online play.' : 'Online module not ready yet.'}</p>
          )}

          {participants.length > 0 ? (
            <ul className="online-participants">
              {participants.map((item, index) => (
                <li key={item.id}>
                  {item.player.avatar} {item.player.name}{' '}
                  {index === onlineRoom?.state.currentPlayer ? '• active' : ''} ·{' '}
                  {item.presence && Date.now() - item.presence.lastSeen < 30000 && item.presence.connected
                    ? 'Online'
                    : 'Offline'}
                </li>
              ))}
            </ul>
          ) : null}

          {onlineError ? <p className="online-error">{onlineError}</p> : null}
        </section>
      ) : null}

      <section className="turn-panel">
        <div>
          <h2>
            {gameOver ? 'Game Over' : `${activePlayer.name} · Round ${currentRound} / 13`}
            {isAiTurn && !gameOver ? <span className="ai-badge">Bot Thinking</span> : null}
            {gameMode === 'online' && !isAiTurn ? (
              <span className="ai-badge">{isMyOnlineTurn ? 'Your Turn' : 'Friend Turn'}</span>
            ) : null}
          </h2>
          <p>{effectiveStatusMessage}</p>
          {hasRolled && turnContext.isExtraYahtzee ? <p className="hint">{turnContext.guidance}</p> : null}
        </div>

        <div className="actions">
          <button
            type="button"
            onClick={rollDice}
            disabled={
              gameOver ||
              effectiveRollsUsed >= 3 ||
              isAiTurn ||
              (gameMode === 'online' && (!onlineRoom?.state.started || !isMyOnlineTurn))
            }
          >
            Roll Dice ({effectiveRollsUsed}/3)
          </button>
        </div>
      </section>

      <DiceRow
        dice={effectiveDice}
        held={effectiveHeld}
        hasRolled={hasRolled}
        gameOver={gameOver}
        isAiTurn={isAiTurn || (gameMode === 'online' && !isMyOnlineTurn)}
        rollFxTick={rollFxTick}
        onToggleHold={toggleHold}
      />

      <ScorecardTable
        players={effectivePlayers}
        currentPlayer={effectiveCurrentPlayer}
        gameOver={gameOver}
        hasRolled={hasRolled}
        isAiTurn={isAiTurn || (gameMode === 'online' && !isMyOnlineTurn)}
        dice={effectiveDice}
        turnContext={turnContext}
        onScoreCategory={scoreCategory}
      />

      <TotalsPanel players={effectivePlayers} />

      {gameOver ? (
        <section className="winner-panel">
          <h2>Final Ranking</h2>
          <ol>
            {rankings.map((entry) => (
              <li key={`${entry.player.name}-rank`}>
                {entry.player.avatar} {entry.player.name}: {entry.total}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <MatchHistoryPanel
        history={history}
        fileRef={importFileRef}
        onExport={exportHistory}
        onImportClick={requestImportHistory}
        onImportFile={importHistory}
        onClear={() => setHistory([])}
      />
    </main>
  )
}

export default App
