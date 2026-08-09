import { format } from "date-fns"

// ---------------------------------------------------------------------------
// The single source of "today" for the whole app. Used to be a fixed
// fictional date (LEDGER_ANCHOR, formerly in @/server/db/generate) so the
// demo's pre-baked ledger always looked current; now that the app runs
// against real data, "today" is the real wall clock.
//
// Plain data/math, no JSX and no @/server imports, so both client and server
// code can import it — same pattern as @/lib/credit and @/lib/ph-cards.
//
// Callers that derive multiple windows from "now" (e.g. a query computing
// both a month boundary and a heatmap range) should call today() ONCE and
// pass the result down, rather than each helper calling it independently —
// otherwise a request straddling midnight can compute two windows for two
// different days.
// ---------------------------------------------------------------------------

/** Start of today, local time. */
export function today(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** Today as "yyyy-MM-dd", for storage/comparison against date columns. */
export function todayISO(): string {
  return format(today(), "yyyy-MM-dd")
}
