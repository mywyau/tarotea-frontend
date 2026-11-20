import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadStrokeData, MissingStrokeData } from '../utils/writing/strokeData'

const data = { strokes: ['M 0 0 L 1 1 Z'], medians: [[[0, 0], [1, 1]]] }

afterEach(() => vi.unstubAllGlobals())

describe('writing stroke data', () => {
  it.each([
    ['咗', '/strokes/cantonese-v1/5497.json'],
    ['𨋢', '/strokes/cantonese-v1/282e2.json'],
    ['我', 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/%E6%88%91.json'],
  ])('loads %s from its configured source', async (char, url) => {
    const fetch = vi.fn().mockResolvedValue(Response.json(data))
    vi.stubGlobal('fetch', fetch)
    expect(await loadStrokeData(char)).toEqual(data)
    expect(fetch).toHaveBeenCalledWith(url, { signal: undefined })
  })

  it('recognises an unlisted character with an upstream 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })))
    await expect(loadStrokeData('龘')).rejects.toBeInstanceOf(MissingStrokeData)
  })

  it.each([['咗', 404], ['我', 503]])('allows retry after %s returns %i', async (char, status) => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status }))
      .mockResolvedValueOnce(Response.json(data))
    vi.stubGlobal('fetch', fetch)
    await expect(loadStrokeData(String(char))).rejects.toThrow('request failed')
    expect(await loadStrokeData(String(char))).toEqual(data)
  })
})
