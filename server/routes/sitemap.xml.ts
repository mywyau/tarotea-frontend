import { searchUrl } from '~/utils/seo'
import { applyPublicContentCacheControl } from '~/server/utils/cacheControl'

export default defineEventHandler(event => {
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  applyPublicContentCacheControl(event)
  const maps = ['/sitemap-pages.xml', '/sitemap-words.xml']
  return '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    + maps.map(path => `<sitemap><loc>${searchUrl(path)}</loc></sitemap>`).join('')
    + '</sitemapindex>'
})
