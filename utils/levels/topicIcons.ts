import {
  Brain,
  BriefcaseBusiness,
  CalendarDays,
  Drama,
  Handshake,
  House,
  MessageSquareText,
  Newspaper,
  Quote,
  ScrollText,
} from '@lucide/vue'
import type { Component } from 'vue'
import { markRaw } from 'vue'

type LevelTopicIcon = {
  icon: Component
  label: string
}

const levelTopicIcons: Record<string, LevelTopicIcon> = {
  'level-one': { icon: markRaw(House), label: 'foundation and daily life' },
  'level-two': { icon: markRaw(CalendarDays), label: 'daily situations and feelings' },
  'level-three': { icon: markRaw(Brain), label: 'thoughts and reasoning' },
  'level-four': { icon: markRaw(MessageSquareText), label: 'opinions and experiences' },
  'level-five': { icon: markRaw(BriefcaseBusiness), label: 'work and services' },
  'level-six': { icon: markRaw(ScrollText), label: 'stories and past experiences' },
  'level-seven': { icon: markRaw(Handshake), label: 'tactful discussion and persuasion' },
  'level-eight': { icon: markRaw(Drama), label: 'reactions and subtle meanings' },
  'level-nine': { icon: markRaw(Newspaper), label: 'news and social issues' },
  'level-ten': { icon: markRaw(Quote), label: 'idioms and fixed phrases' },
}

const defaultLevelTopicIcon = levelTopicIcons['level-one']

export function getLevelTopicIcon(levelId: string) {
  return levelTopicIcons[levelId] ?? defaultLevelTopicIcon
}
