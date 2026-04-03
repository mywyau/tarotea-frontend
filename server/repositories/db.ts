import { attachDatabasePool } from "@vercel/functions";
import pg from "pg";

const { Pool } = pg;

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 6,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 2000,
});

attachDatabasePool(db);
