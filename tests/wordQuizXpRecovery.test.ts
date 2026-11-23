import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { createApp, defineEventHandler, toWebHandler } from "h3";
import { SignJWT } from "jose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const { publishJSON } = vi.hoisted(() => ({ publishJSON: vi.fn() }));
const site = "https://fixture.example";
const signingKey = "disposable-word-quiz-test-signing-key";
const schema = "xp_fixture_" + randomUUID().replaceAll("-", "");
const connectionString = process.env.TEST_VOCAB_XP_DATABASE_URL;
const db = new pg.Pool({ connectionString, options: `-c search_path=${schema}` });

vi.mock("#imports", () => ({
  useRuntimeConfig: () => ({
    public: { siteUrl: site }, qstashToken: "fixture",
    qstashCurrentSigningKey: signingKey, qstashNextSigningKey: signingKey,
  }),
}));
vi.mock("@upstash/qstash", async (original) => ({
  ...(await original<typeof import("@upstash/qstash")>()),
  Client: class { publishJSON = publishJSON; },
}));
vi.mock("~/server/repositories/db", () => ({ db }));
vi.mock("~/server/utils/requireUser", () => ({ requireUser: async () => ({ sub: "learner" }) }));
vi.mock("~/server/utils/rate-limiting/rateLimit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("~/server/utils/logging/redact", () => import("../server/utils/logging/redact"));
vi.mock("~/server/utils/dailyQuiz", () => import("../server/utils/dailyQuiz"));
vi.mock("@/config/xp/helpers", () => import("../config/xp/helpers"));
vi.mock("~/server/utils/publishWordQuizXp", () => import("../server/utils/publishWordQuizXp"));
vi.mock("~/server/utils/qstash/verifyQuizWorkerRequest", () => import("../server/utils/qstash/verifyQuizWorkerRequest"));

const save = "/api/quiz/grind/finalize-v5";
const sweep = "/api/worker/recover-word-quiz-xp";
const worker = "/api/worker/xp-quiz-v5";
const app = createApp();
const handle = toWebHandler(app);

async function post(path: string, payload?: unknown, signFor?: string) {
  const body = payload === undefined ? "" : JSON.stringify(payload);
  const headers = new Headers({ "content-type": "application/json" });
  if (signFor) {
    const token = await new SignJWT({ body: createHash("sha256").update(body).digest("base64url") })
      .setProtectedHeader({ alg: "HS256" }).setIssuer("Upstash").setSubject(site + signFor)
      .setExpirationTime("1m").sign(new TextEncoder().encode(signingKey));
    headers.set("Upstash-Signature", token);
  }
  return handle(new Request(site + path, { method: "POST", headers, body }));
}

describe.skipIf(!connectionString)("vocabulary XP recovery with PostgreSQL", () => {
  beforeAll(async () => {
    vi.stubGlobal("defineEventHandler", defineEventHandler);
    app.use(save, (await import("../server/api/quiz/grind/finalize-v5")).default);
    app.use(sweep, (await import("../server/api/worker/recover-word-quiz-xp.post")).default);
    app.use(worker, (await import("../server/api/worker/xp-quiz-v5.post")).default);
    await db.query(`create schema ${schema}`);
    for (const file of ["00000000_initial_schema.sql", "20261123_word_quiz_xp_recovery.sql"]) {
      await db.query(await readFile(new URL("../docs/migrations/" + file, import.meta.url), "utf8"));
    }
    await db.query("insert into users (id, email) values ('learner', 'fixture@example.test')");
  });

  afterAll(async () => {
    try {
      await db.query(`drop schema if exists ${schema} cascade`);
    } finally {
      await db.end();
      vi.unstubAllGlobals();
    }
  });

  it("recovers a saved quiz after the learner leaves, including across duplicate deliveries", async () => {
    const job = { userId: "learner", attemptId: "closed-tab" };
    const quiz = { attemptId: job.attemptId, mode: "grind-level-audio", answers: [{ wordId: "nei5", correct: true }] };
    publishJSON.mockRejectedValueOnce(new Error("queue unavailable"));
    expect(await (await post(save, quiz)).json()).toMatchObject({ queued: false, status: "recovery_pending" });

    await db.query("update xp_quiz_events set created_at = '2025-01-01' where attempt_id = $1", [job.attemptId]);
    await db.query(`insert into xp_quiz_events (user_id, attempt_id, mode, created_at)
      values ('learner', 'sentence', 'level-sentences', '2025-01-01')`);
    expect((await post(sweep)).status).toBe(401);
    expect((await post(sweep, undefined, worker)).status).toBe(401);
    publishJSON.mockResolvedValue({ messageId: "accepted" });

    const sweeps = await Promise.all([post(sweep, undefined, sweep), post(sweep, undefined, sweep)]);
    expect(await Promise.all(sweeps.map(r => r.json()))).toEqual(expect.arrayContaining([{ submitted: 1 }, { submitted: 0 }]));
    expect(publishJSON).toHaveBeenCalledTimes(2);
    expect(publishJSON.mock.calls[1][0]).toEqual(publishJSON.mock.calls[0][0]);
    expect(publishJSON.mock.calls[1][0].body).toEqual(job);

    const duplicates = await Promise.all([post(worker, job, worker), post(worker, job, worker)]);
    const statuses = await Promise.all(duplicates.map(async r => (await r.json()).status));
    expect(statuses.sort()).toEqual(["already-processed", "processed"]);
    expect((await db.query("select xp, streak from user_word_progress")).rows).toEqual([{ xp: 5, streak: 1 }]);
    expect((await db.query("select total_xp, total_correct from user_stats")).rows).toEqual([{ total_xp: 5, total_correct: 1 }]);
    expect((await db.query("select quizzes_completed from user_stats_daily where stat_date = '2025-01-01'")).rows)
      .toEqual([{ quizzes_completed: 1 }]);
    expect(await (await post(save, quiz)).json()).toMatchObject({ status: "processed", deduped: true, queued: false });
    expect(publishJSON).toHaveBeenCalledTimes(2);
  });

  it("picks up an attempt again if the queue is still offline during recovery", async () => {
    const job = { userId: "learner", attemptId: "second-outage" };
    await db.query(`insert into xp_quiz_events (user_id, attempt_id, mode, created_at)
      values ($1, $2, 'grind-topic-audio', now() - interval '1 hour')`, [job.userId, job.attemptId]);
    publishJSON.mockRejectedValueOnce(new Error("queue still unavailable"));
    expect((await post(sweep, undefined, sweep)).status).toBe(503);
    expect(await (await post(sweep, undefined, sweep)).json()).toEqual({ submitted: 0 });

    await db.query(`update xp_quiz_events set vocab_last_recovery_at = now() - interval '6 minutes'
      where attempt_id = $1`, [job.attemptId]);
    publishJSON.mockResolvedValueOnce({ messageId: "accepted" });
    expect(await (await post(sweep, undefined, sweep)).json()).toEqual({ submitted: 1 });
    expect(publishJSON).toHaveBeenLastCalledWith(expect.objectContaining({ body: job }));
  });

  it("lets the learner retry immediately with the original saved answers", async () => {
    const attemptId = "retry-button";
    const quiz = { attemptId, mode: "grind-topic", answers: [{ wordId: "nei5", correct: true }] };
    publishJSON.mockRejectedValueOnce(new Error("queue unavailable"));
    expect(await (await post(save, quiz)).json()).toMatchObject({ status: "recovery_pending" });
    publishJSON.mockResolvedValueOnce({ messageId: "accepted" });
    expect(await (await post(save, { ...quiz, answers: [{ wordId: "other", correct: false }] })).json())
      .toMatchObject({ deduped: true, queued: true, status: "pending", quiz: { correctCount: 1 } });
    publishJSON.mockResolvedValueOnce({ deduplicated: true });
    expect(await (await post(save, quiz)).json()).toMatchObject({ deduped: true, queued: false, status: "pending" });
    const stored = await db.query("select payload from xp_quiz_events where attempt_id = $1", [attemptId]);
    expect(stored.rows[0].payload.answers).toEqual(quiz.answers);
  });
});
