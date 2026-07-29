import type { ChangeEvent, RefObject } from 'react'
import type { MatchHistoryEntry } from '../game/types'
import './MatchHistoryPanel.css'

interface MatchHistoryPanelProps {
  history: MatchHistoryEntry[]
  fileRef: RefObject<HTMLInputElement | null>
  onExport: () => void
  onImportClick: () => void
  onImportFile: (event: ChangeEvent<HTMLInputElement>) => void
  onClear: () => void
}

export default function MatchHistoryPanel({
  history,
  fileRef,
  onExport,
  onImportClick,
  onImportFile,
  onClear,
}: MatchHistoryPanelProps) {
  return (
    <section className="history-panel">
      <div className="history-head">
        <h2>Match History</h2>
        <div className="history-actions">
          <button type="button" onClick={onExport} disabled={history.length === 0}>
            Export JSON
          </button>
          <button type="button" onClick={onImportClick}>
            Import JSON
          </button>
          <button type="button" onClick={onClear} disabled={history.length === 0}>
            Clear History
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          onChange={onImportFile}
          hidden
        />
      </div>

      {history.length === 0 ? (
        <p className="history-empty">No completed games yet.</p>
      ) : (
        <ul className="history-list">
          {history.map((entry) => (
            <li key={entry.id}>
              <p>
                {new Date(entry.playedAtIso).toLocaleString()} ·{' '}
                {entry.gameMode === 'vsAi' ? 'You vs Bot' : 'Hotseat'} ·{' '}
                {entry.jokerMode === 'forced' ? 'Forced Joker' : 'Free Joker'}
              </p>
              <p>
                Winner: {entry.winners.join(', ')} · Scores:{' '}
                {entry.scores.map((score) => `${score.name} ${score.total}`).join(', ')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
