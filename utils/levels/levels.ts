type LevelId =
  | "level-one"
  | "level-two"
  | "level-three"
  | "level-four"
  | "level-five"
  | "level-six"
  | "level-seven"
  | "level-eight"
  | "level-nine"
  | "level-ten"
  | "level-eleven"
  | "level-twelve"
  | "level-thirteen"
  | "level-fourteen"
  | "level-fifthteen";

type LevelMapping = {
  id: LevelId;
  number: number;
};

export const levelIdToNumbersList: LevelMapping[] = [
  { id: "level-one", number: 1 },
  { id: "level-two", number: 2 },
  { id: "level-three", number: 3 },
  { id: "level-four", number: 4 },
  { id: "level-five", number: 5 },
  { id: "level-six", number: 6 },
  { id: "level-seven", number: 7 },
  { id: "level-eight", number: 8 },
  { id: "level-nine", number: 9 },
  { id: "level-ten", number: 10 },
  { id: "level-eleven", number: 11 },
  { id: "level-twelve", number: 12 },
  { id: "level-thirteen", number: 13 },
  { id: "level-fourteen", number: 14 },
  { id: "level-fifthteen", number: 15 },
];

export function levelIdToNumbers(id: LevelId): number {
  return levelIdToNumbersList.find((level) => level.id === id)!.number;
}
