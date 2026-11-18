import { attachDatabasePool } from "@vercel/functions";
import {
  InstrumentedPool,
  type DatabaseMetric,
} from "~/server/repositories/instrumentedPool";

function recordDatabaseMetric(metric: DatabaseMetric) {
  const log =
    metric.event === "database_acquisition_slow"
      ? console.warn
      : console.error;

  log(
    JSON.stringify({
      ...metric,
      timestamp: new Date().toISOString(),
    }),
  );
}

export const db = new InstrumentedPool(
  {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 8,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 2000,
  },
  { recordMetric: recordDatabaseMetric },
);

attachDatabasePool(db);

export function getDatabasePoolStats() {
  return {
    total: db.totalCount,
    idle: db.idleCount,
    waiting: db.waitingCount,
    instrumentation: db.getInstrumentationStats(),
  };
}
