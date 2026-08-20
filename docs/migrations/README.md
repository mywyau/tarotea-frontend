# Database migrations

Run every pending migration against the database configured by `DATABASE_URL`:

```sh
npm run db:migrate
```

The runner loads `.env.local` and then `.env`; an already exported environment
variable takes precedence. It applies SQL files in filename order, wraps each
migration in a transaction, and records its name and SHA-256 checksum in the
`schema_migrations` table.

`00000000_initial_schema.sql` is the data-free baseline. It creates every table,
constraint, and index currently required by the application. It can initialize
an empty PostgreSQL database without first connecting to another database or
running `pg_dump`.

After a migration has been applied, do not edit it. Add a new, timestamp-prefixed
`.sql` file instead. A changed checksum causes the runner to stop rather than
silently changing migration history.

The migration creates schema only. Content still needs to be loaded separately
with the level and topic seed scripts.
