import { FACE_LABELS } from '../game/constants'
import './DiceRow.css'

interface DiceRowProps {
  dice: number[]
  held: boolean[]
  hasRolled: boolean
  gameOver: boolean
  isAiTurn: boolean
  onToggleHold: (index: number) => void
}

export default function DiceRow({
  dice,
  held,
  hasRolled,
  gameOver,
  isAiTurn,
  onToggleHold,
}: DiceRowProps) {
  return (
    <section className="dice-row" aria-label="Dice">
      {dice.map((value, index) => (
        <button
          key={`die-${index}`}
          type="button"
          className={held[index] ? 'die held' : 'die'}
          onClick={() => onToggleHold(index)}
          disabled={!hasRolled || gameOver || isAiTurn}
          aria-pressed={held[index]}
        >
          <span className="pip">{FACE_LABELS[value - 1]}</span>
          <span className="die-meta">{held[index] ? 'Held' : 'Tap to hold'}</span>
        </button>
      ))}
    </section>
  )
}
