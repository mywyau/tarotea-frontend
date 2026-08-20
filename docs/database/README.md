# Database schema snapshots

The generated `schema.sql` file is a structure-only snapshot of the PostgreSQL
`public` schema. It contains tables, sequences, constraints, indexes, functions,
and other schema objects, but no row data and no database credentials.

Create or refresh the snapshot whenever the production schema changes:

```sh
npm run db:schema:dump
```

Commit the resulting `docs/database/schema.sql` file so it can be used for
disaster recovery or to initialize an empty database.

Restore the snapshot into an empty database:

```sh
DATABASE_URL='postgresql://...' npm run db:schema:restore
```

The restore runs in a single transaction with `ON_ERROR_STOP`, so an error rolls
back the attempted restore. The snapshot intentionally does not contain `DROP`
statements; restoring into a populated database will normally fail instead of
replacing existing objects. This is a schema backup only—use a separate database
backup process if row data must also be recoverable.

Both commands load `DATABASE_URL` from `.env` when it is not already present in
the environment and require PostgreSQL's `pg_dump`/`psql` client tools.
