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
      "Content for level 6",
    ],
  },
  {
    date: "19 Feb 2026",
    title: "Daily",
    items: [
      "Added daily exercises for logged in users who have seen more than 20 words in quizzes",
      "Add stats page for user statistics",
    ],
  },
  {
    date: "10 Feb 2026",
    title: "Xp bars and xp awards for word quizzes",
    items: [
      "Added trial xp bars and xp awards for word quizzes",
      "Added weak word mechanism to help drive weaker words in quizzes for logged in user",
      "Added level 5 content",
    ],
  },
  {
    date: "1 Feb 2026",
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
    date: "5 Jan 2026",
    title: "Create app and add content, quizzes and audio",
    items: [
      "Introduced word-only based quizzes",
      "Introduced audio-only based quizzes",
      "Fixed and improved mobile viewing",
      "Added level 1-3 word tiles",
      "Added Audio and setence examples",
      "App conceptualised and created. Hello World!",
    ],
  },
];
