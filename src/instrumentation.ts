// Runs once per server instance, before it starts handling requests (see
// https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
// — `register()` is awaited and must complete before the server is ready).
// This is where a real deployment's database gets brought up to date: apply
// any pending migrations, then bootstrap the reference data a fresh
// database needs (user row, category taxonomy, budget buckets — see
// @/server/db/bootstrap). Local dev doesn't rely on this; it uses
// `pnpm db:reset` instead.
//
// This replaces what the Docker image used to do at BUILD time (migrate +
// seed into the image, see the Dockerfile's git history) — a real
// deployment's database lives in a volume, not the image, so it has to be
// migrated at boot instead.
export async function register() {
  // better-sqlite3 is a native Node addon — never touch it on the edge
  // runtime (instrumentation.ts runs there too, for the edge middleware
  // path, which this app doesn't use, but the guard costs nothing).
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  // Dynamic imports, not top-level: @/server/db is written to stay safe to
  // import as a side effect of module evaluation alone (in particular
  // during `next build`, which loads this file without ever calling
  // register() — see the comment on getDb() in @/server/db/index). Calling
  // getDb() here, inside register(), is what actually opens the database;
  // importing the module at top level would risk doing that too early.
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator")
  const { getDb } = await import("@/server/db")
  const { bootstrap } = await import("@/server/db/bootstrap")

  const db = getDb()
  migrate(db, { migrationsFolder: "./drizzle" })
  await bootstrap()
}
