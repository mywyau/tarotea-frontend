import type { CharacterJson } from 'hanzi-writer'
import catalog from '../../config/writing-strokes.json'

export class MissingStrokeData extends Error {}

export async function loadStrokeData(char: string, signal?: AbortSignal): Promise<CharacterJson> {
  if (!/^\p{Script=Han}$/u.test(char)) throw new MissingStrokeData(char)
  const local = catalog.characters.includes(char)
  const url = local
    ? `/strokes/${catalog.pack}/${char.codePointAt(0)!.toString(16)}.json`
    : `https://cdn.jsdelivr.net/npm/hanzi-writer-data@${catalog.upstreamVersion}/${encodeURIComponent(char)}.json`
  const response = await fetch(url, { signal })
  if (!local && response.status === 404) throw new MissingStrokeData(char)
  if (!response.ok) throw new Error(`Stroke data request failed (${response.status})`)
  const data: CharacterJson = await response.json()
  if (!Array.isArray(data?.strokes) || !data.strokes.length ||
      !Array.isArray(data.medians) || data.strokes.length !== data.medians.length) {
    throw new Error('Incomplete stroke data')
  }
  return data
}
