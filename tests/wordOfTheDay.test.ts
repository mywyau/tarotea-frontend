import { describe, expect, it } from 'vitest'
import { utcDayNumber, offlineWordForDay, itemForDay } from '../utils/wordOfTheDay'

describe('homepage word of the day', () => {
  it('keeps one entry throughout the UTC day and switches at midnight', () => {
    const at = (iso: string) => offlineWordForDay(utcDayNumber(Date.parse(iso)))
    const morning = at('2026-12-31T00:00:00Z')
    expect(at('2026-12-31T23:59:59.999Z')).toEqual(morning)
    expect(at('2027-01-01T08:00:00+08:00').word).not.toBe(morning.word)
  })

  it('visits the entire published pool even when it contains more than 1,000 entries', () => {
    const ids = Array.from({ length: 2618 }, (_, index) => `word-${index}`)
    const start = utcDayNumber(Date.UTC(2026, 10, 21))
    const cycle = ids.map((_, offset) => itemForDay(start + offset, ids))
    expect(new Set(cycle)).toEqual(new Set(ids))
    expect(itemForDay(start + cycle.length, ids)).toBe(cycle[0])
  })

  it('always serves a different complete entry on consecutive days, including at the end of the rotation', () => {
    const firstDay = utcDayNumber(Date.UTC(2026, 0, 1))
    for (let day = firstDay; day < firstDay + 366; day++) {
      const { word, jyutping, meaning, audioFile } = offlineWordForDay(day)
      expect(word).not.toBe(offlineWordForDay(day + 1).word)
      expect(jyutping.trim()).not.toBe('')
      expect(meaning.trim()).not.toBe('')
      expect(audioFile).toMatch(/\.mp3$/)
    }
  })
})
