export type UpperCategory =
  | 'ones'
  | 'twos'
  | 'threes'
  | 'fours'
  | 'fives'
  | 'sixes'

export type LowerCategory =
  | 'threeKind'
  | 'fourKind'
  | 'fullHouse'
  | 'smallStraight'
  | 'largeStraight'
  | 'yahtzee'
  | 'chance'

export type Category = UpperCategory | LowerCategory
export type JokerMode = 'forced' | 'free'
export type GameMode = 'hotseat' | 'vsAi' | 'online'
export type AiDifficulty = 'casual' | 'smart' | 'ruthless'

export type Scorecard = Record<Category, number | null>

export interface PlayerState {
  name: string
  avatar: string
  scorecard: Scorecard
  yahtzeeBonusCount: number
}

export interface MatchHistoryEntry {
  id: string
  playedAtIso: string
  gameMode: GameMode
  jokerMode: JokerMode
  winners: string[]
  scores: Array<{ name: string; total: number }>
}

export interface PersistedGame {
  playerCount: number
  players: PlayerState[]
  currentPlayer: number
  dice: number[]
  held: boolean[]
  rollsUsed: number
  jokerMode: JokerMode
  gameMode: GameMode
  aiDifficulty: AiDifficulty
  statusMessage: string
  history: MatchHistoryEntry[]
}

export interface TurnContext {
  isExtraYahtzee: boolean
  canAwardYahtzeeBonus: boolean
  correspondingUpper: UpperCategory | null
  correspondingUpperUnused: boolean
  allowed: Set<Category>
  guidance: string
}

export interface OnlineParticipant {
  id: string
  name: string
  avatar: string
  connected: boolean
  lastSeen: number
}

export interface OnlineRoomState {
  players: PlayerState[]
  playerIds: string[]
  maxPlayers: number
  currentPlayer: number
  dice: number[]
  held: boolean[]
  rollsUsed: number
  jokerMode: JokerMode
  statusMessage: string
  started: boolean
  gameOver: boolean
}

export interface OnlineRoomDoc {
  roomCode: string
  hostId: string
  updatedAt: number
  state: OnlineRoomState
  participants: Record<string, OnlineParticipant>
}
