import { computeTotals } from '../game/rules'
import type { PlayerState } from '../game/types'
import './TotalsPanel.css'

interface TotalsPanelProps {
  players: PlayerState[]
}

export default function TotalsPanel({ players }: TotalsPanelProps) {
  return (
    <section className="totals-panel">
      <h2>Totals</h2>
      <div className="totals-grid">
        {players.map((player) => {
          const totals = computeTotals(player)
          return (
            <article key={`${player.name}-totals`} className="total-card">
              <h3>
                {player.avatar} {player.name}
              </h3>
              <p>Upper: {totals.upperSubtotal}</p>
              <p>Upper bonus: {totals.upperBonus}</p>
              <p>Lower: {totals.lowerSubtotal}</p>
              <p>High Five bonus: {totals.yahtzeeBonus}</p>
              <p className="grand">Grand total: {totals.grandTotal}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
