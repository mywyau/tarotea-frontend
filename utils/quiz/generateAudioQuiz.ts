import type { Word } from "./levelOneWords";

export type AudioQuizQuestion = {
  wordId: string;
  type: "audio";
  audioKey: string;
  options: string[];
  correctIndex: number;
};

export function generateAudioQuiz(
  words: Word[],
  count = 5,
): AudioQuizQuestion[] {
  const selected = shuffleFisherYates(words).slice(0, count);

  return selected.map((word) => {
    const distractors = shuffleFisherYates(words.filter((w) => w.id !== word.id)).slice(
      0,
      3,
    );

    const options = shuffleFisherYates([
      word.meaning,
      ...distractors.map((w) => w.meaning),
    ]);

    return {
      wordId: word.id, // ← THIS IS THE FIX
      type: "audio",
      audioKey: `${word.id}.mp3`,
      options,
      correctIndex: options.indexOf(word.meaning),
    };
  });
}
