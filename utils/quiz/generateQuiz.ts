export type QuizQuestion = {
  wordId: string;
  prompt: string;
  options: string[];
  correctIndex: number;
};

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function generateQuiz(words: Word[], count = 20): QuizQuestion[] {
  const selected = shuffle(words).slice(0, count);

  return selected.map((word) => {
    const direction =
      Math.random() > 0.5 ? "word-to-meaning" : "meaning-to-word";

    if (direction === "word-to-meaning") {
      const distractors = shuffle(
        words.filter((w) => w.id !== word.id)
      ).slice(0, 3);

      const options = shuffle([
        word.meaning,
        ...distractors.map((w) => w.meaning),
      ]);

      return {
        wordId: word.id,
        prompt: word.word,
        options,
        correctIndex: options.indexOf(word.meaning),
      };
    }

    // meaning → word
    const distractors = shuffle(
      words.filter((w) => w.id !== word.id)
    ).slice(0, 3);

    const options = shuffle([
      word.word,
      ...distractors.map((w) => w.word),
    ]);

    return {
      wordId: word.id,
      prompt: word.meaning,
      options,
      correctIndex: options.indexOf(word.word),
    };
  });
}
