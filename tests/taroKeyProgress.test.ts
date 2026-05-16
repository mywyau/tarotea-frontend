import { describe, expect, it } from 'vitest'
import {
  getTaroKeyProgress,
  getTaroKeyXpCost,
  getTaroKeysEarned,
} from '../config/unlock/unlock-config'

describe('taro key XP progression', () => {
  it('uses a non-linear XP curve until it reaches 1000 XP', () => {
    expect(Array.from({ length: 8 }, (_, index) => getTaroKeyXpCost(index + 1))).toEqual([
      500,
      550,
      650,
      800,
      1000,
      1000,
      1000,
      1000,
    ])
  })

  it('earns keys from cumulative non-linear XP thresholds', () => {
    expect(getTaroKeysEarned(499)).toBe(0)
    expect(getTaroKeysEarned(500)).toBe(1)
    expect(getTaroKeysEarned(1049)).toBe(1)
    expect(getTaroKeysEarned(1050)).toBe(2)
    expect(getTaroKeysEarned(2500)).toBe(4)
    expect(getTaroKeysEarned(3500)).toBe(5)
    expect(getTaroKeysEarned(4500)).toBe(6)
  })

  it('reports progress toward the next non-linear key cost', () => {
    expect(getTaroKeyProgress(500)).toMatchObject({
      creditsEarned: 1,
      xpNeededForNextTaroKey: 550,
      xpTowardsNextKey: 0,
      xpUntilNextKey: 550,
    })

    expect(getTaroKeyProgress(850)).toMatchObject({
      creditsEarned: 1,
      xpNeededForNextTaroKey: 550,
      xpTowardsNextKey: 350,
      xpUntilNextKey: 200,
    })
  })
})
