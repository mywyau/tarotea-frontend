import { attachDatabasePool } from "@vercel/functions";
import pg from "pg";

const { Pool } = pg;

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 5000,
});

attachDatabasePool(db);
