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
      "Expand content for topics",
      "Content review to fix dodgy translations, jyutping, chinese characters and audio",
    ],
  },
  {
    date: "25 Feb 2026",
    title: "Daily",
    items: [
      "Added Content for Level 6 and 7",
    ],
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
