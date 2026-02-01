import { levelOneWords } from './levelOneWords'
import { levelTwoWords } from './levelTwoWords'
// import more as you add them

export type LevelSlug = 'level-one' | 'level-two' // extend later

export const LEVEL_WORDS: Record<LevelSlug, any[]> = {
  'level-one': levelOneWords,
  'level-two': levelTwoWords,
}
