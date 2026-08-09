// Backs up the SQLite database with VACUUM INTO, which is safe to run
// against a live database in WAL mode — an ordinary `cp` of app.db would
// miss recently-committed rows still sitting in app.db-wal, since WAL
// changes aren't folded into the main file until a checkpoint. VACUUM INTO
// reads through a consistent snapshot and writes a single, fully
// checkpointed file, no live traffic disruption required.
//
// Meant to run on the HOST, not inside the container — the docker-compose
// bind mount (./data:/app/data, see docker-compose.yml) makes the database
// an ordinary file on the host filesystem, so this needs nothing more than
// what local dev already has (tsx, better-sqlite3).
//
// Run with: pnpm db:backup
// Restore: stop the container, `cp backups/app-<stamp>.db data/app.db`,
// delete any leftover data/app.db-wal and data/app.db-shm, start it again.

import fs from "node:fs"
import path from "node:path"
import Database from "better-sqlite3"

const KEEP = 30

function resolveDbPath(): string {
  const url = process.env.DATABASE_URL ?? "file:./data/app.db"
  const file = url.startsWith("file:") ? url.slice("file:".length) : url
  return path.isAbsolute(file) ? file : path.join(process.cwd(), file)
}

function main() {
  const dbPath = resolveDbPath()
  if (!fs.existsSync(dbPath)) {
    throw new Error(`No database found at ${dbPath} — nothing to back up.`)
  }

  const backupsDir = path.join(process.cwd(), "backups")
  fs.mkdirSync(backupsDir, { recursive: true })

  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const outPath = path.join(backupsDir, `app-${stamp}.db`)

  // readonly: VACUUM INTO only ever writes to the NEW file (outPath), never
  // to the source — opening the source readonly is a guarantee, not just a
  // convention, that this script can't touch live data.
  const db = new Database(dbPath, { readonly: true })
  try {
    db.prepare("VACUUM INTO ?").run(outPath)
  } finally {
    db.close()
  }
  console.log(`Backed up ${dbPath} -> ${outPath}`)

  // Prune to the last KEEP backups — filenames are ISO timestamps, so a
  // plain string sort is also chronological order.
  const backups = fs
    .readdirSync(backupsDir)
    .filter((f) => f.startsWith("app-") && f.endsWith(".db"))
    .sort()
  const toDelete = backups.slice(0, Math.max(0, backups.length - KEEP))
  for (const f of toDelete) {
    fs.unlinkSync(path.join(backupsDir, f))
    console.log(`Pruned old backup: ${f}`)
  }
}

main()
