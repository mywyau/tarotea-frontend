import type { TopicWord } from "@/types/topic";
import type { Word } from "@/types/word";
import type { QuizQuestion } from "./generateQuiz";

function shuffle<T>(array: T[]): T[] {
  return [...array].sort(() => Math.random() - 0.5);
}

export function buildTopicQuiz(words: TopicWord[]) {
  return words.map((word) => {
    const incorrect = shuffle(
      words.filter((w) => w.id !== word.id).map((w) => w.meaning),
    ).slice(0, 3);

    const options = shuffle([word.meaning, ...incorrect]);

    return {
      word: word.word,
      jyutping: word.jyutping,
      options,
      correctIndex: options.indexOf(word.meaning),
      type: "text" as const,
    };
  });
}

export function generateQuiz(words: Word[], count = 20): QuizQuestion[] {
  const selected = shuffle(words).slice(0, count);

  return selected.map((word) => {
    const direction =
      Math.random() > 0.5 ? "word-to-meaning" : "meaning-to-word";

    if (direction === "word-to-meaning") {
      const distractors = shuffle(words.filter((w) => w.id !== word.id)).slice(
        0,
        3,
      );

      const options = shuffle([
        word.meaning,
        ...distractors.map((w) => w.meaning),
      ]);

      return {
        prompt: word.word,
        options,
        correctIndex: options.indexOf(word.meaning),
      };
    }

    // meaning → word
    const distractors = shuffle(words.filter((w) => w.id !== word.id)).slice(
      0,
      3,
    );

    const options = shuffle([word.word, ...distractors.map((w) => w.word)]);

    return {
      prompt: word.meaning,
      options,
      correctIndex: options.indexOf(word.word),
    };
  });
}
