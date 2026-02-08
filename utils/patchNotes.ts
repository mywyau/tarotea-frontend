export interface PatchNote {
  date: string
  title?: string
  items: string[]
}

export const patchNotes: PatchNote[] = [
  {
    date: 'Feb 2026',
    title: 'February Dev Notes',
    items: [
      'Fixing up live payments via stripe locked behind Auth',
      'Adding exercise quizzes and exercises section as placeholder for possibly new learning modes',
      'Adding level 1 sentence based exercises',
      'Adding topics placeholder for future content',
      'Slowly adding new level 4 vocabulary - work in progress',
      'Auth still locked',
    ]
  },
  {
    date: 'Jan 2026',
    title: 'Create app and add content, quizzes and audio',
    items: [
      'Introduced word-only based quizzes',
      'Introduced audio-only based quizzes',
      'Fixed and improved mobile viewing',
      'Added level 1-3 word tiles',
      'Added Audio and setence examples',
    ]
  }
]
