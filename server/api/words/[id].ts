import { readFile } from 'fs/promises'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  
  const id = getRouterParam(event, 'id')

  try {
    const file = join(process.cwd(), 'server/data/words', `${id}.json`)
    const json = await readFile(file, 'utf-8')
    console.log(file)
    return JSON.parse(json)
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: 'Word not found'
    })
  }
})
