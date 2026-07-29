import { describe, expect, it } from 'vitest'
import { computeTotals, createEmptyScorecard, getTurnContext, calculateCategoryScore, canUseJokerValue } from './rules'
import type { PlayerState } from './types'

function makePlayer(overrides?: Partial<PlayerState>): PlayerState {
  return {
    name: 'Tester',
    avatar: '🎲',
    scorecard: createEmptyScorecard(),
    yahtzeeBonusCount: 0,
    ...overrides,
  }
}

describe('calculateCategoryScore', () => {
  it('scores upper categories correctly', () => {
    expect(calculateCategoryScore('sixes', [6, 6, 2, 4, 6], { jokerForStraightsAndFullHouse: false })).toBe(18)
    expect(calculateCategoryScore('ones', [1, 1, 2, 3, 4], { jokerForStraightsAndFullHouse: false })).toBe(2)
  })

  it('scores lower fixed categories correctly', () => {
    expect(calculateCategoryScore('fullHouse', [3, 3, 3, 2, 2], { jokerForStraightsAndFullHouse: false })).toBe(25)
    expect(calculateCategoryScore('smallStraight', [1, 2, 3, 4, 6], { jokerForStraightsAndFullHouse: false })).toBe(30)
    expect(calculateCategoryScore('largeStraight', [2, 3, 4, 5, 6], { jokerForStraightsAndFullHouse: false })).toBe(40)
  })

  it('scores n-of-a-kind and chance correctly', () => {
    expect(calculateCategoryScore('threeKind', [2, 2, 2, 4, 6], { jokerForStraightsAndFullHouse: false })).toBe(16)
    expect(calculateCategoryScore('fourKind', [5, 5, 5, 5, 1], { jokerForStraightsAndFullHouse: false })).toBe(21)
    expect(calculateCategoryScore('chance', [6, 5, 4, 3, 2], { jokerForStraightsAndFullHouse: false })).toBe(20)
  })

  it('applies joker override for full house and straights', () => {
    const dice = [6, 6, 6, 6, 6]
    expect(calculateCategoryScore('fullHouse', dice, { jokerForStraightsAndFullHouse: true })).toBe(25)
    expect(calculateCategoryScore('smallStraight', dice, { jokerForStraightsAndFullHouse: true })).toBe(30)
    expect(calculateCategoryScore('largeStraight', dice, { jokerForStraightsAndFullHouse: true })).toBe(40)
  })
})

describe('computeTotals', () => {
  it('adds upper bonus and high-five bonuses into grand total', () => {
    const player = makePlayer({
      scorecard: {
        ones: 3,
        twos: 6,
        threes: 9,
        fours: 12,
        fives: 15,
        sixes: 18,
        threeKind: 18,
        fourKind: 18,
        fullHouse: 25,
        smallStraight: 30,
        largeStraight: 40,
        yahtzee: 50,
        chance: 20,
      },
      yahtzeeBonusCount: 2,
    })

    const totals = computeTotals(player)
    expect(totals.upperSubtotal).toBe(63)
    expect(totals.upperBonus).toBe(35)
    expect(totals.lowerSubtotal).toBe(201)
    expect(totals.yahtzeeBonus).toBe(200)
    expect(totals.grandTotal).toBe(499)
  })
})

describe('getTurnContext and joker constraints', () => {
  it('forces corresponding upper box in forced mode when extra five-of-kind and upper is unused', () => {
    const player = makePlayer({
      scorecard: {
        ...createEmptyScorecard(),
        yahtzee: 50,
      },
    })

    const context = getTurnContext(player, [4, 4, 4, 4, 4], 'forced')
    expect(context.isExtraYahtzee).toBe(true)
    expect(context.allowed.has('fours')).toBe(true)
    expect(context.allowed.size).toBe(1)
  })

  it('allows lower section selection in forced mode when corresponding upper already used', () => {
    const player = makePlayer({
      scorecard: {
        ...createEmptyScorecard(),
        yahtzee: 50,
        fours: 8,
      },
    })

    const context = getTurnContext(player, [4, 4, 4, 4, 4], 'forced')
    expect(context.allowed.has('fullHouse')).toBe(true)
    expect(context.allowed.has('smallStraight')).toBe(true)
    expect(context.allowed.has('largeStraight')).toBe(true)
  })

  it('marks joker-friendly categories correctly', () => {
    const player = makePlayer({
      scorecard: {
        ...createEmptyScorecard(),
        yahtzee: 50,
        sixes: 12,
      },
    })

    const context = getTurnContext(player, [6, 6, 6, 6, 6], 'forced')
    expect(canUseJokerValue('fullHouse', context)).toBe(true)
    expect(canUseJokerValue('smallStraight', context)).toBe(true)
    expect(canUseJokerValue('largeStraight', context)).toBe(true)
    expect(canUseJokerValue('chance', context)).toBe(false)
  })

  it('does not award bonus eligibility if high-five box was zeroed earlier', () => {
    const player = makePlayer({
      scorecard: {
        ...createEmptyScorecard(),
        yahtzee: 0,
      },
    })

    const context = getTurnContext(player, [3, 3, 3, 3, 3], 'forced')
    expect(context.isExtraYahtzee).toBe(true)
    expect(context.canAwardYahtzeeBonus).toBe(false)
  })
})
