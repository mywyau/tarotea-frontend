export const levelTitles: Record<string, string> = {
  'level-one': 'Level 1',
  'level-two': 'Level 2',
  'level-three': 'Level 3',
  'level-four': 'Level 4',
  'level-five': 'Level 5',
  'level-six': 'Level 6',
  'level-seven': 'Level 7',
  'level-eight': 'Level 8',
  'level-nine': 'Level 9',
  'level-ten': 'Level 10',
  'level-eleven': 'Level 11',
  'level-twelve': 'Level 12',
  'level-thirteen': 'Level 13',
  'level-fourteen': 'Level 14',
  'level-fiftheen': 'Level 15',
}

export const levelIdToNumberMap = {
  "level-one": 1,
  "level-two": 2,
  "level-three": 3,
  "level-four": 4,
  "level-five": 5,
  "level-six": 6,
  "level-seven": 7,
  "level-eight": 8,
  "level-nine": 9,
  "level-ten": 10,
} as const

type LevelId = keyof typeof levelIdToNumberMap

export function isLevelId(value: string): value is LevelId {
  return value in levelIdToNumberMap
}

export function levelIdToNumbers(id: LevelId): number {
  return levelIdToNumberMap[id]
}