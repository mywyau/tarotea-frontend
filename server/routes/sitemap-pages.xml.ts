import { publicHubs } from '~/utils/seo'
import { levelSelectMetaData } from '~/utils/levels/helpers'
import { topics } from '~/utils/topics/topics'
import { renderSitemap } from '~/server/utils/renderSitemap'

export default defineEventHandler(event => renderSitemap(event, [
  ...publicHubs,
  ...levelSelectMetaData.filter(level => !level.comingSoon).map(level => `/level/${level.id}`),
  ...topics.filter(topic => !topic.comingSoon).map(topic => `/topic/words/${topic.id}`),
]))
