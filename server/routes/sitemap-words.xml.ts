import { getStatsWordCatalogue } from '~/server/services/stats/wordCatalogue'
import { renderSitemap } from '~/server/utils/renderSitemap'

export default defineEventHandler(async event => {
  const catalogue = await getStatsWordCatalogue()
  return renderSitemap(event, catalogue.publicPaths)
})
