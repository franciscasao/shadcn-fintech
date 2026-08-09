import path from "node:path"
import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"

import * as schema from "./schema"

// ---------------------------------------------------------------------------
// Lazy singleton SQLite connection. Lazy so that importing this module (or
// anything that transitively imports it) never opens the database file as a
// side effect of module evaluation — in particular, this must stay safe to
// import during `next build`, which loads route/page modules without ever
// calling a handler.
// ---------------------------------------------------------------------------

// The single seeded demo user — see src/server/db/seed.ts. There's no auth
// in this app; every query and mutation is scoped to this id so real
// multi-user auth can be added later without reshaping the schema.
export const DEMO_USER_ID = 1

function resolveDbPath() {
  const url = process.env.DATABASE_URL ?? "file:./data/app.db"
  const file = url.startsWith("file:") ? url.slice("file:".length) : url
  if (path.isAbsolute(file)) return file
  // This runs at request time only (see getSqlite() below), never during
  // the build — but Turbopack's static analysis can't tell that, and
  // path.join(process.cwd(), <dynamic>) makes it conservatively assume
  // this route could read anywhere on disk, which balloons the standalone
  // output's file trace to the whole project (and, worse, silently breaks
  // it — see the "outputFileTracingRoot" comment in next.config.ts).
  // turbopackIgnore tells it to stop trying to resolve this statically.
  return path.join(/* turbopackIgnore: true */ process.cwd(), file)
}

let _sqlite: Database.Database | undefined
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined

function getSqlite() {
  if (!_sqlite) {
    _sqlite = new Database(resolveDbPath())
    _sqlite.pragma("journal_mode = WAL")
    _sqlite.pragma("foreign_keys = ON")
  }
  return _sqlite
}

export function getDb() {
  if (!_db) {
    _db = drizzle(getSqlite(), { schema })
  }
  return _db
}
