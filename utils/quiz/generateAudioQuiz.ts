import type { Word } from "./levelOneWords";

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export type AudioQuizQuestion = {
  wordId: string;
  type: "audio";
  audioKey: string;
  options: string[];
  correctIndex: number;
};

export function generateAudioQuiz(
  words: Word[],
  count = 20,
): AudioQuizQuestion[] {
  const selected = shuffle(words).slice(0, count);

  return selected.map((word) => {
    const distractors = shuffle(words.filter((w) => w.id !== word.id)).slice(
      0,
      3,
    );

    const options = shuffle([
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
