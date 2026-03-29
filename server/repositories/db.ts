import pg from "pg";
import { attachDatabasePool } from '@vercel/functions'

const { Pool } = pg;

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 2,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 2000,
});

attachDatabasePool(db)