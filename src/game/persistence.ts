import { LOCAL_STORAGE_KEY } from './constants'
import { createPlayers } from './rules'
import type { MatchHistoryEntry, PersistedGame } from './types'

export function getDefaultState(): PersistedGame {
  return {
    playerCount: 2,
    players: createPlayers(2, 'hotseat'),
    currentPlayer: 0,
    dice: [1, 1, 1, 1, 1],
    held: [false, false, false, false, false],
    rollsUsed: 0,
    jokerMode: 'forced',
    gameMode: 'hotseat',
    aiDifficulty: 'smart',
    statusMessage: 'Roll the dice. You may roll up to 3 times, then score one category.',
    history: [],
  }
}

export function loadPersistedState() {
  if (typeof window === 'undefined') {
    return getDefaultState()
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) {
      return getDefaultState()
    }

    const parsed = JSON.parse(raw) as PersistedGame
    if (!Array.isArray(parsed.players) || !Array.isArray(parsed.dice) || !Array.isArray(parsed.held)) {
      return getDefaultState()
    }

    const playersWithAvatars = parsed.players.map((player, index) => ({
      ...player,
      avatar:
        typeof player.avatar === 'string' && player.avatar.trim()
          ? player.avatar
          : ['🎲', '🦊', '🦉', '🐯', '🐧', '🦄'][index % 6],
    }))

    return {
      ...getDefaultState(),
      ...parsed,
      players: playersWithAvatars,
      aiDifficulty:
        parsed.aiDifficulty === 'casual' ||
        parsed.aiDifficulty === 'smart' ||
        parsed.aiDifficulty === 'ruthless'
          ? parsed.aiDifficulty
          : 'smart',
      history: Array.isArray(parsed.history) ? parsed.history : [],
    }
  } catch {
    return getDefaultState()
  }
}

export function savePersistedState(data: PersistedGame) {
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
}

export function exportHistoryJson(history: MatchHistoryEntry[]) {
  const payload = {
    exportedAtIso: new Date().toISOString(),
    app: 'Yacht Royale',
    history,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `yacht-royale-history-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.URL.revokeObjectURL(url)
}

export async function importHistoryJson(file: File) {
  const raw = await file.text()
  const parsed = JSON.parse(raw) as { history?: MatchHistoryEntry[] } | MatchHistoryEntry[]
  const incoming = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.history)
      ? parsed.history
      : []

  const sanitized: MatchHistoryEntry[] = incoming
    .filter((entry) => entry && Array.isArray(entry.scores) && Array.isArray(entry.winners))
    .map((entry, index) => ({
      id: typeof entry.id === 'string' ? entry.id : `imported-${Date.now()}-${index}`,
      playedAtIso:
        typeof entry.playedAtIso === 'string' ? entry.playedAtIso : new Date().toISOString(),
      gameMode: (entry.gameMode === 'vsAi' ? 'vsAi' : 'hotseat') as MatchHistoryEntry['gameMode'],
      jokerMode: (entry.jokerMode === 'free' ? 'free' : 'forced') as MatchHistoryEntry['jokerMode'],
      winners: entry.winners.map((winner) => String(winner)),
      scores: entry.scores.map((score) => ({
        name: String(score.name),
        total: Number(score.total) || 0,
      })),
    }))

  return sanitized
}
