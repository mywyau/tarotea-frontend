import { createHash } from 'node:crypto'
import { getStatsWordCatalogue } from '~/server/services/stats/wordCatalogue'
import { itemForDay, utcDayNumber } from '../../utils/wordOfTheDay'

type FeaturedWord = { word: string; jyutping: string; meaning: string }

const getDailyFeature = defineCachedFunction(async (cdnBase: string, day: number) => {
  const { all } = await getStatsWordCatalogue(cdnBase)
  // Mix levels and topics in a repeatable order, independent of catalogue traversal.
  const ids = all.map(id => ({ id, order: createHash('sha256').update(id).digest('hex') }))
    .sort((a, b) => a.order.localeCompare(b.order))
    .map(entry => entry.id)

  async function entryForDay(date: number): Promise<FeaturedWord> {
    const id = itemForDay(date, ids)
    const { word, jyutping, meaning } = await $fetch<FeaturedWord>(
      `${cdnBase}/words/${encodeURIComponent(id)}.json`, { timeout: 3000, retry: 0 },
    )
    if (!word || !jyutping || !meaning) throw new Error('Incomplete featured word')
    return { word, jyutping, meaning }
  }

  const [today, tomorrow] = await Promise.all([entryForDay(day), entryForDay(day + 1)])
  return { day, today, tomorrow }
}, { name: 'daily-featured-words', maxAge: 86400 })

export default defineEventHandler(event => {
  const { cdnBase } = useRuntimeConfig(event).public
  setHeader(event, 'Cache-Control', 'no-cache')
  return getDailyFeature(cdnBase, utcDayNumber(Date.now()))
})
