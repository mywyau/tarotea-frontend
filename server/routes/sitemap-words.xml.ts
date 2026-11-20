import { getStatsWordCatalogue } from '~/server/services/stats/wordCatalogue'
import { renderSitemap } from '~/server/utils/renderSitemap'

export default defineEventHandler(async event => {
  const catalogue = await getStatsWordCatalogue(useRuntimeConfig(event).public.cdnBase)
  return renderSitemap(event, catalogue.publicPaths)
})
