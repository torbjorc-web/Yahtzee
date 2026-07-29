import { useEffect, useState } from 'react'
import { FACE_LABELS } from '../game/constants'
import './DiceRow.css'

interface DiceRowProps {
  dice: number[]
  held: boolean[]
  hasRolled: boolean
  gameOver: boolean
  isAiTurn: boolean
  rollFxTick: number
  onToggleHold: (index: number) => void
}

export default function DiceRow({
  dice,
  held,
  hasRolled,
  gameOver,
  isAiTurn,
  rollFxTick,
  onToggleHold,
}: DiceRowProps) {
  const [isRollingFx, setIsRollingFx] = useState(false)

  useEffect(() => {
    if (rollFxTick <= 0) {
      return
    }

    setIsRollingFx(true)
    const timeoutId = window.setTimeout(() => {
      setIsRollingFx(false)
    }, 560)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [rollFxTick])

  return (
    <section className="dice-row" aria-label="Dice">
      {dice.map((value, index) => (
        <button
          key={`die-${index}`}
          type="button"
          className={`${held[index] ? 'die held' : 'die'} ${isRollingFx ? `rolling roll-${index}` : ''}`}
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
