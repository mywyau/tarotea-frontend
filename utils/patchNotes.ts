export interface PatchNote {
  date: string;
  title?: string;
  items: string[];
}

export const patchNotes: PatchNote[] = [
  {
    date: "March 2026",
    title: "Upcoming",
    items: [
      "Expanding content",
      "Content review to fix dodgy/missing translations, jyutping, chinese characters and audio",
      "Fix UX across site",
    ],
  },
  {
    date: "9 March 2026",
    title: "Echo Labs has landed",
    items: [
      "Creation of Echo Labs to help users test pronunciation - trial",
    ],
  },
  {
    date: "8 March 2026",
    title: "Content blast",
    items: [
      "Add content for sports and fitness, furniture and home, feelings and emotions, countries, and family members",
      "improve mobile view for typing exercises for longer words",
    ],
  },
  {
    date: "5 March 2026",
    title: "Sweep up and fix dojo quizzes",
    items: [
      "Fixed randomness shuffling of words in quizzes",
      "Added chinese only dojo typing quiz, play for bigger and more rewarding xp gains",
      "General sweep up of inconsistencies",
    ],
  },
  {
    date: "1 March 2026",
    title: "Polish, fixing bugs, UX changes",
    items: [
      "Daily Jyutping challenge, styling and UX changes upcoming",
      "Jyutping dojo version 1 completed, future work on stytling and polish",
    ],
  },
  {
    date: "27 Feb 2026",
    title: "More content and prototype jyutping training",
    items: [
      "Add level 8-10 and dim sum content",
      "Work in progress add jyutping training",
    ],
  },
  {
    date: "25 Feb 2026",
    title: "Add more content",
    items: ["Added Content for Level 6 and 7"],
  },
  {
    date: "19 Feb 2026",
    title: "Daily",
    items: [
      "Added daily exercises for logged-in users who have seen more than 20 words in quizzes",
      "Added stats page for user statistics",
      "Updated styling",
    ],
  },
  {
    date: "10 Feb 2026",
    title: "XP bars and XP awards for word quizzes",
    items: [
      "Added trial XP bars and XP awards for word quizzes",
      "Added weak word mechanism to surface weaker words in quizzes for logged-in users",
      "Added Level 5 content",
    ],
  },
  {
    date: "1 Feb 2026",
    title: "February Dev Notes",
    items: [
      "Added 5 topics (4 free, 1 paid)",
      "Added topic quizzes: vocabulary, sentence meaning, and audio",
      "Added new Level 4 vocabulary, audio, and quizzes",
      "Added topic placeholders for future content",
      "Authentication still locked",
    ],
  },
  {
    date: "5 Jan 2026",
    title: "App creation and initial content release",
    items: [
      "Introduced word-only quizzes",
      "Introduced audio-only quizzes",
      "Fixed and improved mobile viewing",
      "Added Level 1–3 word tiles",
      "Added audio and sentence examples",
      "App conceptualised and created. Hello World!",
    ],
  },
];
