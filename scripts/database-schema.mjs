#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const snapshotPath = resolve(projectRoot, "docs/database/schema.sql");

const envPath = resolve(projectRoot, ".env");
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

function usage() {
  console.log(`Usage:
  node scripts/database-schema.mjs dump
  node scripts/database-schema.mjs restore

Commands:
  dump     Save the public PostgreSQL schema to docs/database/schema.sql
  restore  Apply that snapshot to the database in a single transaction

DATABASE_URL must be set in the environment or in .env.
PostgreSQL client tools (pg_dump and psql) must be installed.`);
}

function fail(message) {
  console.error(`Database schema: ${message}`);
  process.exit(1);
}

function requireDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    fail("DATABASE_URL is not set. Add it to .env or export it in your shell.");
  }
}

function run(program, args) {
  const result = spawnSync(program, args, {
    cwd: projectRoot,
    // PGDATABASE accepts a connection URI and keeps credentials out of the
    // child process's command-line arguments.
    env: { ...process.env, PGDATABASE: process.env.DATABASE_URL },
    stdio: "inherit",
  });

  if (result.error?.code === "ENOENT") {
    fail(`${program} was not found. Install the PostgreSQL client tools first.`);
  }

  if (result.error) {
    fail(`${program} could not start: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(`${program} exited with status ${result.status}.`);
  }
}

function dump() {
  requireDatabaseUrl();
  mkdirSync(dirname(snapshotPath), { recursive: true });

  const temporaryPath = `${snapshotPath}.tmp`;
  rmSync(temporaryPath, { force: true });

  try {
    run("pg_dump", [
      "--schema-only",
      "--schema=public",
      "--no-owner",
      "--no-privileges",
      "--file",
      temporaryPath,
    ]);
    renameSync(temporaryPath, snapshotPath);
  } finally {
    rmSync(temporaryPath, { force: true });
  }

  console.log(`Schema snapshot written to ${snapshotPath}`);
}

function restore() {
  requireDatabaseUrl();

  if (!existsSync(snapshotPath)) {
    fail(`no snapshot exists at ${snapshotPath}. Run the dump command first.`);
  }

  run("psql", [
    "--set",
    "ON_ERROR_STOP=1",
    "--single-transaction",
    "--file",
    snapshotPath,
  ]);

  console.log("Schema snapshot restored successfully.");
}

const command = process.argv[2];

if (command === "dump") {
  dump();
} else if (command === "restore") {
  restore();
} else {
  usage();
  process.exit(command === "--help" || command === "-h" ? 0 : 1);
}
