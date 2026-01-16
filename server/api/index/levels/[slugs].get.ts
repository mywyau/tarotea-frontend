import { db } from '~/server/db'
import { getRouterParam, getHeader, createError } from 'h3'
import { getLevelNumber } from '@/utils/levels' // or '~/utils/levels' depending on your alias
import levelData from '@/server/api/index/levels/[id]' // <- replace with however you're currently loading the level JSON

export default defineEventHandler(async (event) => {

  const slug = getRouterParam(event, 'slug')
  
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing level slug' })
  }

  const levelNumber = getLevelNumber(slug)
  if (!levelNumber) {
    throw createError({ statusCode: 404, statusMessage: 'Level not found' })
  }

  // ✅ Free levels (adjust this rule however you like)
  const FREE_UP_TO_LEVEL = 1
  if (levelNumber <= FREE_UP_TO_LEVEL) {
    return levelData[slug] // <- return your existing level payload
  }

  // 🔒 Locked levels require a user id (MVP approach)
  const userId = getHeader(event, 'x-user-id')
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Sign in required' })
  }

  // 🔒 Require pro entitlement
  const { rows } = await db.query(
    `select plan, active from entitlements where user_id = $1`,
    [userId]
  )

  const ent = rows[0]
  const isPro = ent?.plan === 'pro' && ent?.active === true

  if (!isPro) {
    throw createError({ statusCode: 403, statusMessage: 'Upgrade required' })
  }

  return levelData[slug]
})
