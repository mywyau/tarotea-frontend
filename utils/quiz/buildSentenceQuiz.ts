// ~/utils/quiz/buildSentenceQuiz.ts
export type SentenceQuizQuestion = {
  sentenceId: string;
  wordId: string;
  prompt: string;
  jyutping: string;
  correctSentence: string;
  options: string[];
  correctIndex: number;
  sourceWord: string;
  sourceWordMeaning: string;
  sourceWordJyutping: string;
};

type TopicSentenceItem = {
  sentenceId: string;
  sentence: string;
  jyutping: string;
  meaning: string;
  sourceWordId: string;
  sourceWord: string;
  sourceWordJyutping: string;
  sourceWordMeaning: string;
  tags: string[];
  sourceFile: string;
};

export function buildSentenceQuiz(
  items: TopicSentenceItem[],
): SentenceQuizQuestion[] {
  const allSentences = items.map((i) => i.sentence);

  return shuffleFisherYates(items).map((item) => {
    const wrongOptions = shuffleFisherYates(
      allSentences.filter((s) => s !== item.sentence),
    ).slice(0, 3);

    const options = shuffleFisherYates([item.sentence, ...wrongOptions]);

    return {
      sentenceId: item.sentenceId,
      wordId: item.sourceWordId,
      prompt: item.meaning,
      jyutping: item.jyutping,
      correctSentence: item.sentence,
      options,
      correctIndex: options.findIndex((o) => o === item.sentence),
      sourceWord: item.sourceWord,
      sourceWordMeaning: item.sourceWordMeaning,
      sourceWordJyutping: item.sourceWordJyutping,
    };
  });
}
