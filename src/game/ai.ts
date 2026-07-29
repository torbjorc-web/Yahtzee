import type { AiDifficulty, Category, TurnContext } from './types'
import { calculateCategoryScore, canUseJokerValue, countByFace, isUpperCategory, isYahtzeeRoll } from './rules'

export function buildAiHoldMask(dice: number[], difficulty: AiDifficulty) {
  if (difficulty === 'casual') {
    const randomFace = Math.floor(Math.random() * 6) + 1
    return dice.map((value) => value === randomFace)
  }

  const counts = countByFace(dice)
  let bestFace = 1
  let bestCount = counts[1]

  for (let face = 2; face <= 6; face += 1) {
    if (counts[face] > bestCount || (counts[face] === bestCount && face > bestFace)) {
      bestFace = face
      bestCount = counts[face]
    }
  }

  const holdByFace = dice.map((value) => value === bestFace)
  const unique = [...new Set(dice)]

  if (difficulty === 'ruthless' && isYahtzeeRoll(dice)) {
    return [true, true, true, true, true]
  }

  if (unique.length >= 4) {
    const straightCandidates = [
      [1, 2, 3, 4],
      [2, 3, 4, 5],
      [3, 4, 5, 6],
      [1, 2, 3, 4, 5],
      [2, 3, 4, 5, 6],
    ]
    const bestStraight = straightCandidates.find((set) =>
      set.every((value) => unique.includes(value)),
    )
    if (bestStraight) {
      return dice.map((value) => bestStraight.includes(value))
    }
  }

  if (difficulty === 'ruthless') {
    const highValues = dice.map((value) => value >= 5)
    const highCount = highValues.filter(Boolean).length
    if (highCount >= 3) {
      return highValues
    }
  }

  return holdByFace
}

export function chooseAiCategory(
  allowed: Category[],
  dice: number[],
  turnContext: TurnContext,
  difficulty: AiDifficulty,
) {
  if (allowed.length === 0) {
    return null
  }

  const weighted = allowed
    .map((category) => {
      const score = calculateCategoryScore(category, dice, {
        jokerForStraightsAndFullHouse: canUseJokerValue(category, turnContext),
      })
      const upperBonusWeight =
        difficulty === 'ruthless' && isUpperCategory(category) ? score * 0.2 : 0
      const comboWeight =
        difficulty === 'ruthless' &&
        (category === 'largeStraight' || category === 'yahtzee' || category === 'fullHouse')
          ? 4
          : 0
      return { category, weighted: score + upperBonusWeight + comboWeight }
    })
    .sort((a, b) => {
      if (difficulty === 'casual') {
        return Math.random() - 0.5
      }
      return b.weighted - a.weighted
    })

  return weighted[0]?.category ?? null
}
