import type { Word } from "~/types/level/quiz/types";

export type AudioQuizQuestion = {
  wordId: string;
  type: "audio";
  audioKey: string;
  options: string[];
  correctIndex: number;
  meaning: string;
  jyutping: string;
  correctWord: string;
};

export function generateAudioQuiz(
  words: Word[],
  count = 20,
): AudioQuizQuestion[] {
  const selected = shuffleFisherYates(words).slice(0, count);

  return selected.map((word) => {
    const distractors = shuffleFisherYates(
      words.filter((w) => w.id !== word.id)
    ).slice(0, 3);

    const options = shuffleFisherYates([
      word.word,
      ...distractors.map((w) => w.word),
    ]);

    return {
      wordId: word.id,
      type: "audio",
      audioKey: `${word.id}.mp3`,
      options,
      correctIndex: options.indexOf(word.word),
      meaning: word.meaning,
      jyutping: word.jyutping,
      correctWord: word.word,
    };
  });
}