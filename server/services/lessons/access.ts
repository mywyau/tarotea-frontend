import { createError, getHeader, type H3Event } from "h3";
import { getStatsWordCatalogue } from "~/server/services/stats/wordCatalogue";
import { db } from "~/server/repositories/db";
import { getUserEntitlement } from "~/server/utils/getEntitlement";
import { requireUser } from "~/server/utils/requireUser";
import { hasPaidAccess } from "~/utils/paidAccess";

type Catalogue = Awaited<ReturnType<typeof getStatsWordCatalogue>>;

function lessonCatalogue() {
  return getStatsWordCatalogue();
}

export async function purchasedLessonIds(userId: string, ids: string[]) {
  const { rows } = await db.query<{ word_id: string }>(
    "select word_id from user_word_unlocks where user_id = $1 and word_id = any($2::text[])",
    [userId, ids],
  );
  return rows.map(row => row.word_id);
}

async function selectAllowed(catalogue: Catalogue, ids: string[], userId?: string | null, scope?: string) {
  const published = new Set(catalogue.all);
  const publicIds = new Set(scope ? catalogue.previewsByScope[scope] ?? [] : catalogue.publicWordIds);
  const candidates = [...new Set(ids)].filter(id => published.has(id));
  const allowed = new Set(candidates.filter(id => publicIds.has(id)));
  if (!userId || allowed.size === candidates.length) return allowed;

  if (hasPaidAccess(await getUserEntitlement(userId))) return new Set(candidates);
  for (const id of await purchasedLessonIds(userId, candidates)) allowed.add(id);
  return allowed;
}

export async function allowedLessonIds(ids: string[], userId?: string | null, scope?: string) {
  return selectAllowed(await lessonCatalogue(), ids, userId, scope);
}

export async function lessonReader(event: H3Event) {
  if (!getHeader(event, "authorization")) return undefined;
  return (await requireUser(event)).sub;
}

export async function requireLesson(event: H3Event, id: string) {
  const catalogue = await lessonCatalogue();
  if (!catalogue.all.includes(id)) {
    throw createError({ statusCode: 404, statusMessage: "Word not found" });
  }
  const userId = await lessonReader(event);
  const allowed = await selectAllowed(catalogue, [id], userId);
  if (allowed.has(id)) return;
  throw createError(userId
    ? { statusCode: 403, statusMessage: "Unlock this word to continue" }
    : { statusCode: 401, statusMessage: "Sign in to access this word" });
}
