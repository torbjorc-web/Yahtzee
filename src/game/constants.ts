import type { Category, LowerCategory, UpperCategory } from './types'

export const UPPER_CATEGORIES: UpperCategory[] = [
  'ones',
  'twos',
  'threes',
  'fours',
  'fives',
  'sixes',
]

export const LOWER_CATEGORIES: LowerCategory[] = [
  'threeKind',
  'fourKind',
  'fullHouse',
  'smallStraight',
  'largeStraight',
  'yahtzee',
  'chance',
]

export const ALL_CATEGORIES: Category[] = [...UPPER_CATEGORIES, ...LOWER_CATEGORIES]

export const JOKER_FRIENDLY: LowerCategory[] = [
  'fullHouse',
  'smallStraight',
  'largeStraight',
]

export const CATEGORY_LABELS: Record<Category, string> = {
  ones: 'Ones',
  twos: 'Twos',
  threes: 'Threes',
  fours: 'Fours',
  fives: 'Fives',
  sixes: 'Sixes',
  threeKind: 'Three of a Kind',
  fourKind: 'Four of a Kind',
  fullHouse: 'Full House',
  smallStraight: 'Small Straight',
  largeStraight: 'Large Straight',
  yahtzee: 'High Five',
  chance: 'Chance',
}

export const FACE_LABELS = ['I', 'II', 'III', 'IV', 'V', 'VI']

export const LOCAL_STORAGE_KEY = 'yacht-royale-state-v1'

export const DEFAULT_AVATARS = ['🎲', '🦊', '🦉', '🐯', '🐧', '🦄']
