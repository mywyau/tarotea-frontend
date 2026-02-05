export interface PatchNote {
  date: string
  title?: string
  items: string[]
}

export const patchNotes: PatchNote[] = [
  {
    date: 'Feb 2026',
    title: 'New learning content',
    items: [
      'Adding new level 4 vocabulary content',
      'Adding level 1 sentence based exercises',
      'Auth still locked',
    ]
  },
  {
    date: 'Jan 2026',
    title: 'Creat app and add content, quizzes and audio',
    items: [
      'Introduced word-only based quizzes',
      'Introduced audio-only based quizzes',
      'Fixed and improved mobile viewing',
    ]
  }
]
