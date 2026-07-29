import { useEffect, useState } from 'react'
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

const FACE_DOT_CELLS: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
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
          <span className="die-face" aria-hidden="true">
            {Array.from({ length: 9 }, (_, cellIndex) => {
              const cell = cellIndex + 1
              const active = FACE_DOT_CELLS[value]?.includes(cell)
              return <span key={cell} className={active ? 'pip-dot on' : 'pip-dot off'} />
            })}
          </span>
          <span className="die-meta">{held[index] ? 'Held' : 'Tap to hold'}</span>
        </button>
      ))}
    </section>
  )
}
