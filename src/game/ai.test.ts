import { describe, expect, it } from 'vitest'
import { buildAiHoldMask, chooseAiCategory } from './ai'
import { createEmptyScorecard } from './rules'
import type { TurnContext } from './types'

function makeContext(allowed: TurnContext['allowed']): TurnContext {
  return {
    isExtraYahtzee: false,
    canAwardYahtzeeBonus: false,
    correspondingUpper: null,
    correspondingUpperUnused: false,
    allowed,
    guidance: 'test',
  }
}

describe('buildAiHoldMask', () => {
  it('smart mode holds the most frequent highest face', () => {
    const mask = buildAiHoldMask([2, 6, 6, 3, 6], 'smart')
    expect(mask).toEqual([false, true, true, false, true])
  })

  it('ruthless mode holds all dice on five-of-kind', () => {
    const mask = buildAiHoldMask([4, 4, 4, 4, 4], 'ruthless')
    expect(mask).toEqual([true, true, true, true, true])
  })

  it('ruthless mode prefers high faces when enough 5/6 are present', () => {
    const mask = buildAiHoldMask([5, 6, 5, 2, 1], 'ruthless')
    expect(mask).toEqual([true, true, true, false, false])
  })
})

describe('chooseAiCategory', () => {
  it('returns null when no categories are allowed', () => {
    const context = makeContext(new Set())
    expect(chooseAiCategory([], [1, 2, 3, 4, 5], context, 'smart')).toBeNull()
  })

  it('smart mode picks the highest raw scoring category', () => {
    const allowed = ['fullHouse', 'chance'] as const
    const context = makeContext(new Set(allowed))
    const chosen = chooseAiCategory([...allowed], [3, 3, 3, 2, 2], context, 'smart')
    expect(chosen).toBe('fullHouse')
  })

  it('ruthless mode favors premium combo categories', () => {
    const allowed = ['largeStraight', 'chance'] as const
    const context = makeContext(new Set(allowed))
    const chosen = chooseAiCategory([...allowed], [2, 3, 4, 5, 6], context, 'ruthless')
    expect(chosen).toBe('largeStraight')
  })

  it('casual mode still returns an allowed category', () => {
    const allowed = ['ones', 'chance', 'threeKind'] as const
    const context = makeContext(new Set(allowed))
    const chosen = chooseAiCategory([...allowed], [1, 2, 2, 4, 6], context, 'casual')
    expect(chosen).toBeTruthy()
    expect(new Set(allowed).has(chosen as (typeof allowed)[number])).toBe(true)
  })

  it('works with a real-like turn context shape for joker-safe calls', () => {
    const scorecard = createEmptyScorecard()
    expect(scorecard.yahtzee).toBeNull()
    const context = makeContext(new Set(['chance']))
    const chosen = chooseAiCategory(['chance'], [6, 6, 6, 2, 2], context, 'smart')
    expect(chosen).toBe('chance')
  })
})
