// Run from the frontend checkout. An optional local jsDelivr inventory allows offline audits.
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

const root = fileURLToPath(new URL('../', import.meta.url))
const { values } = parseArgs({ options: {
  words: { type: 'string', default: join(root, '../openai-tts/r2-backup/words') },
  inventory: { type: 'string' },
} })
const readJson = async path => JSON.parse(await readFile(path, 'utf8'))
const catalog = await readJson(join(root, 'config/writing-strokes.json'))
async function upstreamInventory() {
  if (values.inventory) return readJson(values.inventory)
  const response = await fetch(`https://data.jsdelivr.com/v1/package/npm/hanzi-writer-data@${catalog.upstreamVersion}/flat`)
  if (!response.ok) throw new Error(`Upstream inventory returned ${response.status}`)
  return response.json()
}
const upstream = new Set((await upstreamInventory()).files.map(file => file.name))
const covered = new Set()
for (const char of catalog.characters) {
  const filename = char.codePointAt(0).toString(16) + '.json'
  const data = await readJson(join(root, 'public/strokes', catalog.pack, filename))
  if (!data.strokes?.length || data.strokes.length !== data.medians?.length ||
      !data.strokes.every(stroke => typeof stroke === 'string' && /^M\b/.test(stroke)) ||
      !data.medians.every(line => line.length >= 2 && line.every(point =>
        point.length === 2 && point.every(Number.isFinite)))) throw new Error(`Invalid stroke data for ${char}`)
  covered.add(char)
}
const seen = new Set(), missing = new Map()
let words = 0, examples = 0
function inspect(text) {
  for (const char of text.match(/\p{Script=Han}/gu) ?? []) {
    seen.add(char)
    if (!covered.has(char) && !upstream.has(`/${char}.json`)) missing.set(char, (missing.get(char) ?? 0) + 1)
  }
}
for (const name of await readdir(values.words)) {
  if (!name.endsWith('.json')) continue
  const word = await readJson(join(values.words, name))
  if (typeof word.word !== 'string') continue
  words++
  inspect(word.word)
  for (const example of word.examples ?? []) {
    examples++
    inspect(example.sentence)
  }
}
if (!words || !seen.size) throw new Error('No Han vocabulary found in the supplied word directory')
console.log(`${seen.size - missing.size}/${seen.size} unique Han characters covered across ${words} words and ${examples} examples.`)
for (const [char, count] of [...missing].sort((a, b) => b[1] - a[1])) console.log(`${char}\t${count} occurrences`)
if (missing.size) process.exitCode = 1
