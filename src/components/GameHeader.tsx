import type { AiDifficulty, GameMode, JokerMode, PlayerState } from '../game/types'
import './GameHeader.css'

interface GameHeaderProps {
  players: PlayerState[]
  gameMode: GameMode
  playerCount: number
  jokerMode: JokerMode
  aiDifficulty: AiDifficulty
  onGameModeChange: (value: GameMode) => void
  onPlayerCountChange: (value: number) => void
  onJokerModeChange: (value: JokerMode) => void
  onAiDifficultyChange: (value: AiDifficulty) => void
  onNewGame: () => void
  onPlayerNameChange: (index: number, value: string) => void
  onPlayerAvatarChange: (index: number, value: string) => void
}

export default function GameHeader({
  players,
  gameMode,
  playerCount,
  jokerMode,
  aiDifficulty,
  onGameModeChange,
  onPlayerCountChange,
  onJokerModeChange,
  onAiDifficultyChange,
  onNewGame,
  onPlayerNameChange,
  onPlayerAvatarChange,
}: GameHeaderProps) {
  return (
    <header className="hero-panel">
      <p className="eyebrow">Parlor Dice League</p>
      <h1>Yacht Royale</h1>
      <p className="subtitle">
        A custom dice-table game inspired by classic category dice play, with official-style Joker handling.
      </p>

      <div className="controls">
        <label>
          Match Type
          <select
            value={gameMode}
            onChange={(event) => onGameModeChange(event.target.value as GameMode)}
          >
            <option value="hotseat">Local Multiplayer</option>
            <option value="vsAi">You vs House Bot</option>
            <option value="online">Online Room (2-6 players)</option>
          </select>
        </label>

        <label>
          Bot Level
          <select
            value={aiDifficulty}
            onChange={(event) => onAiDifficultyChange(event.target.value as AiDifficulty)}
            disabled={gameMode !== 'vsAi'}
          >
            <option value="casual">Casual</option>
            <option value="smart">Smart</option>
            <option value="ruthless">Ruthless</option>
          </select>
        </label>

        <label>
          Players
          <select
            value={playerCount}
            onChange={(event) => onPlayerCountChange(Number(event.target.value))}
            disabled={gameMode === 'vsAi'}
          >
            {[1, 2, 3, 4, 5, 6].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </label>

        <label>
          Joker Mode
          <select
            value={jokerMode}
            onChange={(event) => onJokerModeChange(event.target.value as JokerMode)}
          >
            <option value="forced">Forced (official style)</option>
            <option value="free">Free choice (alternative)</option>
          </select>
        </label>

        <button type="button" onClick={onNewGame}>
          New Game
        </button>
      </div>

      <div className="player-config-list">
        {players.map((player, index) => (
          <div key={`${player.name}-${index}`} className="player-config-card">
            <label>
              Avatar
              <input
                value={player.avatar}
                onChange={(event) => onPlayerAvatarChange(index, event.target.value)}
                maxLength={2}
              />
            </label>
            <label>
              Name
              <input
                value={player.name}
                onChange={(event) => onPlayerNameChange(index, event.target.value)}
                maxLength={24}
              />
            </label>
          </div>
        ))}
      </div>
    </header>
  )
}
