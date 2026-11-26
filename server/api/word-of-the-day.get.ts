import { readLessonJson } from "~/server/services/lessons/storage";
import { createHash } from 'node:crypto'
import { getStatsWordCatalogue } from '~/server/services/stats/wordCatalogue'
import { itemForDay, utcDayNumber } from '../../utils/wordOfTheDay'

type CatalogueWord = { word: string; jyutping: string; meaning: string; audio?: { word?: string } }

const getDailyFeature = defineCachedFunction(async (day: number) => {
  const { all } = await getStatsWordCatalogue()
  // Mix levels and topics in a repeatable order, independent of catalogue traversal.
  const ids = all.map(id => ({ id, order: createHash('sha256').update(id).digest('hex') }))
    .sort((a, b) => a.order.localeCompare(b.order))
    .map(entry => entry.id)

  async function entryForDay(date: number) {
    const id = itemForDay(date, ids)
    const { word, jyutping, meaning, audio } = await readLessonJson<CatalogueWord>("words", id)
    if (!word || !jyutping || !meaning) throw new Error('Incomplete featured word')
    return { word, jyutping, meaning, audioFile: audio?.word || null }
  }

  const [today, tomorrow] = await Promise.all([entryForDay(day), entryForDay(day + 1)])
  return { day, today, tomorrow }
}, { name: 'daily-featured-words-with-audio', maxAge: 86400 })

export default defineEventHandler(event => {
  setHeader(event, 'Cache-Control', 'no-cache')
  return getDailyFeature(utcDayNumber(Date.now()))
})
