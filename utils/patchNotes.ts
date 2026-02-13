export interface PatchNote {
  date: string;
  title?: string;
  items: string[];
}

export const patchNotes: PatchNote[] = [
  {
    date: "Feb 2026",
    title: "Upcoming",
    items: [
      "More content for topics 'time & dates' & 'money'",
      "More content for level 5 & 6",
      "Sentence based topic quiz to have a larger sentence pool, instead of just 20 questions",
      "",
      "",
    ],
  },
  {
    date: "Feb 2026",
    title: "February Dev Notes",
    items: [
      "Added topics 5 topics, 4 free topics, 1 paid",
      "Adding quizzes for topics. Vocabulary, word only sentences and word audio.",
      "Added new level 4 vocabulary, audio and quizzes",
      "Adding topics placeholder for future content",
      "Auth still locked",
    ],
  },
  {
    date: "Jan 2026",
    title: "Create app and add content, quizzes and audio",
    items: [
      "Introduced word-only based quizzes",
      "Introduced audio-only based quizzes",
      "Fixed and improved mobile viewing",
      "Added level 1-3 word tiles",
      "Added Audio and setence examples",
    ],
  },
];
