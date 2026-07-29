import { ALL_CATEGORIES, CATEGORY_LABELS } from '../game/constants'
import { calculateCategoryScore, canUseJokerValue } from '../game/rules'
import type { Category, PlayerState, TurnContext } from '../game/types'
import './ScorecardTable.css'

interface ScorecardTableProps {
  players: PlayerState[]
  currentPlayer: number
  gameOver: boolean
  hasRolled: boolean
  isAiTurn: boolean
  dice: number[]
  turnContext: TurnContext
  onScoreCategory: (category: Category) => void
}

export default function ScorecardTable({
  players,
  currentPlayer,
  gameOver,
  hasRolled,
  isAiTurn,
  dice,
  turnContext,
  onScoreCategory,
}: ScorecardTableProps) {
  return (
    <section className="scorecard-wrap">
      <table className="scorecard">
        <thead>
          <tr>
            <th>Category</th>
            {players.map((player, index) => (
              <th key={player.name} className={index === currentPlayer && !gameOver ? 'active-col' : ''}>
                {player.avatar} {player.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ALL_CATEGORIES.map((category) => (
            <tr key={category}>
              <td>{CATEGORY_LABELS[category]}</td>
              {players.map((player, index) => {
                const value = player.scorecard[category]
                const currentCell = index === currentPlayer && !gameOver
                const canChoose = currentCell && hasRolled && value === null && !isAiTurn

                if (value !== null) {
                  return <td key={`${player.name}-${category}`}>{value}</td>
                }

                if (!canChoose) {
                  return (
                    <td key={`${player.name}-${category}`} className="muted-cell">
                      -
                    </td>
                  )
                }

                const canUseCategory = turnContext.allowed.has(category)
                const previewScore = calculateCategoryScore(category, dice, {
                  jokerForStraightsAndFullHouse: canUseJokerValue(category, turnContext),
                })

                return (
                  <td key={`${player.name}-${category}`}>
                    <button
                      type="button"
                      className="score-btn"
                      disabled={!canUseCategory}
                      onClick={() => onScoreCategory(category)}
                    >
                      {canUseCategory ? `Score ${previewScore}` : 'Locked'}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
