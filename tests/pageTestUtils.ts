import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export function readPage(file: string) {
  return readFileSync(resolve(process.cwd(), 'pages', file), 'utf8')
}
