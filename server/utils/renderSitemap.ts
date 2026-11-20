import type { H3Event } from 'h3'
import { searchUrl } from '~/utils/seo'
import { applyPublicContentCacheControl } from './cacheControl'

export function renderSitemap(event: H3Event, paths: string[]) {
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  applyPublicContentCacheControl(event)
  const entries = paths.map(path => `<url><loc>${searchUrl(path).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</loc></url>`)
  return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + entries.join('') + '</urlset>'
}
