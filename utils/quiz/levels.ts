import { levelOneWords } from "./levelOneWords";
import { levelThreeWords } from "./levelThreeWords";
import { levelTwoWords } from "./levelTwoWords";

export type LevelSlug =
  | "level-one"
  | "level-two"
  | "level-three"
  | "level-four"
  | "level-five"
  | "level-six"
  | "level-eight"
  | "level-nine"
  | "level-ten"
  | "level-eleven"
  | "level-tweleve"
  | "level-thirteen";

export const LEVEL_WORDS: Record<LevelSlug, any[]> = {
  "level-one": levelOneWords,
  "level-two": levelTwoWords,
  "level-three": levelThreeWords,
  "level-four": levelThreeWords,
  "level-five": levelThreeWords,
  "level-six": levelThreeWords,
  "level-eight": levelThreeWords,
  "level-nine": levelThreeWords,
  "level-ten": levelThreeWords,
  "level-eleven": levelThreeWords,
  "level-tweleve": levelThreeWords,
  "level-thirteen": levelThreeWords,
};
