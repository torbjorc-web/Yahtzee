import {
  ALL_CATEGORIES,
  CATEGORY_LABELS,
  JOKER_FRIENDLY,
  LOWER_CATEGORIES,
  UPPER_CATEGORIES,
} from './constants'
import type {
  Category,
  GameMode,
  JokerMode,
  PlayerState,
  Scorecard,
  TurnContext,
  UpperCategory,
} from './types'

export function rollDie() {
  return Math.floor(Math.random() * 6) + 1
}

export function createEmptyScorecard(): Scorecard {
  return {
    ones: null,
    twos: null,
    threes: null,
    fours: null,
    fives: null,
    sixes: null,
    threeKind: null,
    fourKind: null,
    fullHouse: null,
    smallStraight: null,
    largeStraight: null,
    yahtzee: null,
    chance: null,
  }
}

export function createPlayers(count: number, gameMode: GameMode): PlayerState[] {
  if (gameMode === 'vsAi') {
    return [
      { name: 'You', avatar: '🧑', scorecard: createEmptyScorecard(), yahtzeeBonusCount: 0 },
      {
        name: 'House Bot',
        avatar: '🤖',
        scorecard: createEmptyScorecard(),
        yahtzeeBonusCount: 0,
      },
    ]
  }

  if (gameMode === 'online') {
    return [
      { name: 'You', avatar: '🧑', scorecard: createEmptyScorecard(), yahtzeeBonusCount: 0 },
      { name: 'Friend', avatar: '🙂', scorecard: createEmptyScorecard(), yahtzeeBonusCount: 0 },
    ]
  }

  return Array.from({ length: count }, (_, index) => ({
    name: `Player ${index + 1}`,
    avatar: ['🎲', '🦊', '🦉', '🐯', '🐧', '🦄'][index % 6],
    scorecard: createEmptyScorecard(),
    yahtzeeBonusCount: 0,
  }))
}

export function countByFace(dice: number[]) {
  const counts = [0, 0, 0, 0, 0, 0, 0]
  for (const value of dice) {
    counts[value] += 1
  }
  return counts
}

export function sumDice(dice: number[]) {
  return dice.reduce((sum, value) => sum + value, 0)
}

export function isYahtzeeRoll(dice: number[]) {
  return dice.every((value) => value === dice[0])
}

export function hasNOfKind(dice: number[], n: number) {
  const counts = countByFace(dice)
  return counts.some((count) => count >= n)
}

export function isFullHouse(dice: number[]) {
  const sortedCounts = countByFace(dice)
    .slice(1)
    .filter((count) => count > 0)
    .sort((a, b) => a - b)
  return sortedCounts.length === 2 && sortedCounts[0] === 2 && sortedCounts[1] === 3
}

export function isSmallStraight(dice: number[]) {
  const unique = [...new Set(dice)].sort((a, b) => a - b)
  const sequences = [
    [1, 2, 3, 4],
    [2, 3, 4, 5],
    [3, 4, 5, 6],
  ]
  return sequences.some((sequence) => sequence.every((value) => unique.includes(value)))
}

export function isLargeStraight(dice: number[]) {
  const unique = [...new Set(dice)].sort((a, b) => a - b)
  const asString = unique.join('-')
  return asString === '1-2-3-4-5' || asString === '2-3-4-5-6'
}

export function getUpperForFace(face: number): UpperCategory {
  return UPPER_CATEGORIES[Math.max(0, Math.min(5, face - 1))]
}

export function isUpperCategory(category: Category): category is UpperCategory {
  return UPPER_CATEGORIES.includes(category as UpperCategory)
}

export function calculateCategoryScore(
  category: Category,
  dice: number[],
  opts: { jokerForStraightsAndFullHouse: boolean },
) {
  const counts = countByFace(dice)
  if (isUpperCategory(category)) {
    const face = UPPER_CATEGORIES.indexOf(category) + 1
    return counts[face] * face
  }

  switch (category) {
    case 'threeKind':
      return hasNOfKind(dice, 3) ? sumDice(dice) : 0
    case 'fourKind':
      return hasNOfKind(dice, 4) ? sumDice(dice) : 0
    case 'fullHouse':
      return opts.jokerForStraightsAndFullHouse || isFullHouse(dice) ? 25 : 0
    case 'smallStraight':
      return opts.jokerForStraightsAndFullHouse || isSmallStraight(dice) ? 30 : 0
    case 'largeStraight':
      return opts.jokerForStraightsAndFullHouse || isLargeStraight(dice) ? 40 : 0
    case 'yahtzee':
      return isYahtzeeRoll(dice) ? 50 : 0
    case 'chance':
      return sumDice(dice)
    default:
      return 0
  }
}

export function countFilled(scorecard: Scorecard) {
  return ALL_CATEGORIES.filter((category) => scorecard[category] !== null).length
}

export function computeTotals(player: PlayerState) {
  const upperSubtotal = UPPER_CATEGORIES.reduce(
    (sum, category) => sum + (player.scorecard[category] ?? 0),
    0,
  )
  const upperBonus = upperSubtotal >= 63 ? 35 : 0
  const lowerSubtotal = LOWER_CATEGORIES.reduce(
    (sum, category) => sum + (player.scorecard[category] ?? 0),
    0,
  )
  const yahtzeeBonus = player.yahtzeeBonusCount * 100
  const grandTotal = upperSubtotal + upperBonus + lowerSubtotal + yahtzeeBonus
  return { upperSubtotal, upperBonus, lowerSubtotal, yahtzeeBonus, grandTotal }
}

export function getTurnContext(
  player: PlayerState,
  dice: number[],
  jokerMode: JokerMode,
): TurnContext {
  const unused = ALL_CATEGORIES.filter((category) => player.scorecard[category] === null)
  const yahtzeeCategory = player.scorecard.yahtzee
  const isExtraYahtzee = isYahtzeeRoll(dice) && yahtzeeCategory !== null

  if (!isExtraYahtzee) {
    return {
      isExtraYahtzee: false,
      canAwardYahtzeeBonus: false,
      correspondingUpper: null,
      correspondingUpperUnused: false,
      allowed: new Set(unused),
      guidance: 'Choose any unused category.',
    }
  }

  const correspondingUpper = getUpperForFace(dice[0])
  const correspondingUpperUnused = player.scorecard[correspondingUpper] === null
  const canAwardYahtzeeBonus = yahtzeeCategory === 50

  if (jokerMode === 'forced') {
    if (correspondingUpperUnused) {
      return {
        isExtraYahtzee,
        canAwardYahtzeeBonus,
        correspondingUpper,
        correspondingUpperUnused,
        allowed: new Set([correspondingUpper]),
        guidance: `Forced Joker: you must score ${CATEGORY_LABELS[correspondingUpper]}.`,
      }
    }

    const unusedLower = LOWER_CATEGORIES.filter((category) => player.scorecard[category] === null)
    if (unusedLower.length > 0) {
      return {
        isExtraYahtzee,
        canAwardYahtzeeBonus,
        correspondingUpper,
        correspondingUpperUnused,
        allowed: new Set(unusedLower),
        guidance:
          'Forced Joker: choose an unused lower category. Full House and Straights may score as Joker values.',
      }
    }

    const unusedUpper = UPPER_CATEGORIES.filter((category) => player.scorecard[category] === null)
    return {
      isExtraYahtzee,
      canAwardYahtzeeBonus,
      correspondingUpper,
      correspondingUpperUnused,
      allowed: new Set(unusedUpper),
      guidance: 'Forced Joker: all lower categories are filled, so pick an unused upper category.',
    }
  }

  return {
    isExtraYahtzee,
    canAwardYahtzeeBonus,
    correspondingUpper,
    correspondingUpperUnused,
    allowed: new Set(unused),
    guidance:
      'Free Joker: choose any unused category. Joker values for Full House/Straights only apply when matching upper box is already filled.',
  }
}

export function canUseJokerValue(
  category: Category,
  turnContext: TurnContext,
) {
  return (
    turnContext.isExtraYahtzee &&
    !turnContext.correspondingUpperUnused &&
    JOKER_FRIENDLY.includes(category as (typeof JOKER_FRIENDLY)[number])
  )
}
