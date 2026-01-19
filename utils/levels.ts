export const LEVELS = [
  { id: 'level-one', number: 1 },
  { id: 'level-two', number: 2 },
  { id: 'level-three', number: 3 }
]

export function getLevelNumber(id: string): number | null {
  return LEVELS.find(l => l.id === id)?.number ?? null
}
