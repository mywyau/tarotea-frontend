export const LEVELS = [
  { id: "level-one", number: 1 },
  { id: "level-two", number: 2 },
  { id: "level-three", number: 3 },
  { id: "level-four", number: 4 },
  { id: "level-five", number: 5 },
  { id: "level-six", number: 6 },
  { id: "level-seven", number: 7 },
  { id: "level-eight", number: 8 },
  { id: "level-nine", number: 9 },
  { id: "level-ten", number: 10 }
];

export function getLevelNumber(id: string): number | null {
  return LEVELS.find(l => l.id === id)?.number ?? null
}