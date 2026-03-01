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