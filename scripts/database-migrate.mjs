#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDirectory = resolve(projectRoot, "docs/migrations");

for (const envFile of [".env.local", ".env"]) {
  const envPath = resolve(projectRoot, envFile);
  if (existsSync(envPath)) process.loadEnvFile(envPath);
}

function fail(message) {
  console.error(`Database migration: ${message}`);
  process.exitCode = 1;
}

if (!process.env.DATABASE_URL) {
  fail("DATABASE_URL is not set. Add it to .env.local/.env or export it in your shell.");
} else {
  let pg;
  try {
    ({ default: pg } = await import("pg"));
  } catch (error) {
    if (error?.code === "ERR_MODULE_NOT_FOUND") {
      fail("the pg package is not installed. Run npm install first.");
      process.exit();
    }
    throw error;
  }

  const migrationFiles = readdirSync(migrationsDirectory)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  let connected = false;

  try {
    await client.connect();
    connected = true;
    await client.query(
      "select pg_advisory_lock(hashtext('tarotea_database_migrations'))",
    );

    await client.query(`
      create table if not exists schema_migrations (
        name text primary key,
        checksum text not null,
        applied_at timestamptz not null default now()
      )
    `);

    const appliedResult = await client.query(
      "select name, checksum from schema_migrations",
    );
    const applied = new Map(
      appliedResult.rows.map((row) => [row.name, row.checksum]),
    );

    for (const name of migrationFiles) {
      const sql = readFileSync(resolve(migrationsDirectory, name), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const previousChecksum = applied.get(name);

      if (previousChecksum) {
        if (previousChecksum !== checksum) {
          throw new Error(
            `${name} changed after it was applied; create a new migration instead`,
          );
        }

        console.log(`skip  ${name}`);
        continue;
      }

      await client.query("begin");
      try {
        await client.query(sql);
        await client.query(
          "insert into schema_migrations (name, checksum) values ($1, $2)",
          [name, checksum],
        );
        await client.query("commit");
        console.log(`apply ${name}`);
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }

    console.log("Database migrations are up to date.");
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  } finally {
    if (connected) {
      await client
        .query("select pg_advisory_unlock(hashtext('tarotea_database_migrations'))")
        .catch(() => {});
    }
    await client.end().catch(() => {});
  }
}
