// import { createError, getQuery } from "h3";
// import { db } from "~/server/repositories/db";
// import { redis } from "~/server/repositories/redis";
// import { enforceRateLimit } from "~/server/utils/rate-limiting/rateLimit";
// import { requireUser } from "~/server/utils/requireUser";
// import { generateWeightedWords } from "~/utils/quiz/generateWeightedWords";
// import { topics } from "~/utils/topics/topics";
// import { totalQuestions, weakestWordRatio } from "~/utils/weakestWords";

// const QUIZ_SESSION_TTL_SECONDS = 60 * 30;

// type VocabWord = {
//   id: string;
//   word: string;
//   jyutping: string;
//   meaning: string;
// };

// type TopicData = {
//   categories: Record<string, VocabWord[]>;
// };

// type DojoVariant = "jyutping" | "chinese";
// type DojoMode = "dojo-topic-jyutping" | "dojo-topic-chinese";

// type QuizSession = {
//   version: 1;
//   mode: DojoMode;
//   scope: "topic";
//   slug: string;
//   createdAt: string;
//   allowedWordIds: string[];
// };

// function resolveVariant(rawVariant: string): DojoVariant {
//   if (rawVariant === "jyutping" || rawVariant === "chinese") {
//     return rawVariant;
//   }

//   throw createError({
//     statusCode: 400,
//     statusMessage: "Unsupported variant",
//   });
// }

// function resolveMode(variant: DojoVariant): DojoMode {
//   switch (variant) {
//     case "jyutping":
//       return "dojo-topic-jyutping";
//     case "chinese":
//       return "dojo-topic-chinese";
//   }
// }

// function resolveTitle(variant: DojoVariant, slug: string) {
//   const topicTitle = topics.find((topic) => topic.id === slug)?.title ?? slug;

//   switch (variant) {
//     case "jyutping":
//       return `Jyutping Dojo - ${topicTitle}`;
//     case "chinese":
//       return `Chinese Dojo - ${topicTitle}`;
//   }
// }

// export default defineEventHandler(async (event) => {
//   const auth = await requireUser(event);
//   const userId = auth.sub;

//   await enforceRateLimit(`rl:start:typing-topic-sentences:${userId}`, 20, 60);

//   const query = getQuery(event);
//   const scope = String(query.scope ?? "topic");
//   const slug = String(query.slug ?? "");
//   const variant = resolveVariant(String(query.variant ?? "jyutping"));
//   const mode = resolveMode(variant);

//   if (!slug) {
//     throw createError({
//       statusCode: 400,
//       statusMessage: "Missing slug",
//     });
//   }

//   if (scope !== "topic") {
//     throw createError({
//       statusCode: 400,
//       statusMessage: "Unsupported scope",
//     });
//   }

//   let topicData: TopicData;

//   try {
//     topicData = await $fetch<TopicData>(`/api/topic/${slug}`);
//   } catch {
//     throw createError({
//       statusCode: 404,
//       statusMessage: "Topic set not found",
//     });
//   }

//   const allWords = Object.values(topicData.categories ?? {}).flat();

//   if (!allWords.length) {
//     const sessionKey = crypto.randomUUID();

//     const session: QuizSession = {
//       version: 1,
//       mode,
//       scope: "topic",
//       slug,
//       createdAt: new Date().toISOString(),
//       allowedWordIds: [],
//     };

//     await redis.set(
//       `dojo:typing:topic:${userId}:${sessionKey}`,
//       JSON.stringify(session),
//       { ex: QUIZ_SESSION_TTL_SECONDS },
//     );

//     return {
//       sessionKey,
//       session: {
//         mode,
//         topic: slug,
//         title: resolveTitle(variant, slug),
//         totalWords: 0,
//         words: [],
//       },
//       progress: {},
//     };
//   }

//   const allWordIds = [...new Set(allWords.map((w) => w.id))];

//   const progressRes = await db.query<{
//     word_id: string;
//     xp: number | string | null;
//   }>(
//     `
//     select word_id, xp
//     from user_word_progress
//     where user_id = $1
//       and word_id = any($2::text[])
//     `,
//     [userId, allWordIds],
//   );

//   const xpMap = new Map<string, number>(
//     progressRes.rows.map((row) => [row.word_id, Number(row.xp ?? 0)]),
//   );

//   const weakestIds = [...allWords]
//     .map((w) => ({
//       id: w.id,
//       xp: xpMap.get(w.id) ?? 0,
//     }))
//     .sort((a, b) => a.xp - b.xp)
//     .map((w) => w.id);

//   const selected = generateWeightedWords(allWords, weakestIds, {
//     totalQuestions,
//     weakestRatio: weakestWordRatio,
//   });

//   const progress: Record<string, { xp: number }> = {};

//   for (const word of selected) {
//     progress[word.id] = {
//       xp: xpMap.get(word.id) ?? 0,
//     };
//   }

//   const sessionKey = crypto.randomUUID();

//   const session: QuizSession = {
//     version: 1,
//     mode,
//     scope: "topic",
//     slug,
//     createdAt: new Date().toISOString(),
//     allowedWordIds: selected.map((w) => w.id),
//   };

//   await redis.set(
//     `dojo:typing:topic:${userId}:${sessionKey}`,
//     JSON.stringify(session),
//     { ex: QUIZ_SESSION_TTL_SECONDS },
//   );

//   return {
//     sessionKey,
//     session: {
//       mode,
//       topic: slug,
//       title: resolveTitle(variant, slug),
//       totalWords: selected.length,
//       words: selected.map((w) => ({
//         wordId: w.id,
//         word: w.word,
//         jyutping: w.jyutping,
//         meaning: w.meaning,
//       })),
//     },
//     progress,
//   };
// });
