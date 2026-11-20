// ~/utils/quiz/buildSentenceQuiz.ts

import { shuffleFisherYates } from "../shuffle"

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

function makeQuestion(item: TopicSentenceItem, answer: string, distractors: string[]): SentenceQuizQuestion {
  const options = shuffleFisherYates([answer, ...distractors]);
  return {
    sentenceId: item.sentenceId,
    wordId: item.sourceWordId,
    prompt: item.meaning,
    jyutping: item.jyutping,
    correctSentence: item.sentence,
    options,
    correctIndex: options.indexOf(answer),
    sourceWord: item.sourceWord,
    sourceWordMeaning: item.sourceWordMeaning,
    sourceWordJyutping: item.sourceWordJyutping,
  };
}

export function buildSentenceQuiz(
  items: TopicSentenceItem[],
): SentenceQuizQuestion[] {
  const allSentences = items.map((i) => i.sentence);

  return shuffleFisherYates(items).map((item) => {
    const wrongOptions = shuffleFisherYates(
      allSentences.filter((s) => s !== item.sentence),
    ).slice(0, 3);

    return makeQuestion(item, item.sentence, wrongOptions);
  });
}

// Tone digits delimit syllables even where the transcript omits spaces.
function spokenTokens(jyutping: string): string {
  return (jyutping.toLowerCase().match(/[a-z]+[1-6]/g) ?? []).join(" ");
}

function hearsWord(transcript: string, pronunciation: string): boolean {
  return pronunciation.length > 0 && ` ${transcript} `.includes(` ${pronunciation} `);
}

export function hasSpokenTarget(item: TopicSentenceItem): boolean {
  return Boolean(item.sourceWord && item.sentence.includes(item.sourceWord))
    && hearsWord(spokenTokens(item.jyutping), spokenTokens(item.sourceWordJyutping));
}

export function buildWordListeningQuiz(items: TopicSentenceItem[], categories: Map<string, string>): SentenceQuizQuestion[] {
  // The caller selects one eligible sentence per target word.
  const vocabulary = items.map(item => ({
    word: item.sourceWord,
    pronunciation: spokenTokens(item.sourceWordJyutping),
    category: categories.get(item.sourceWordId),
  }));

  const questions: SentenceQuizQuestion[] = [];
  for (const item of items) {
    const transcript = spokenTokens(item.jyutping);
    const category = categories.get(item.sourceWordId);
    const candidates = shuffleFisherYates(vocabulary.filter(candidate =>
      candidate.pronunciation && !item.sentence.includes(candidate.word)
      && !hearsWord(transcript, candidate.pronunciation)
    ));
    // Keep the random order within each group, with related vocabulary first.
    const ranked = [
      ...candidates.filter(candidate => candidate.category === category),
      ...candidates.filter(candidate => candidate.category !== category),
    ];
    const distractors: string[] = [];
    const pronunciations = new Set<string>();
    for (const candidate of ranked) {
      if (distractors.includes(candidate.word) || pronunciations.has(candidate.pronunciation)) continue;
      distractors.push(candidate.word);
      pronunciations.add(candidate.pronunciation);
      if (distractors.length === 3) break;
    }

    if (distractors.length === 3) questions.push(makeQuestion(item, item.sourceWord, distractors));
  }
  return questions;
}
