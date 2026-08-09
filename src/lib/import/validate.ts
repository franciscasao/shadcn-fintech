import { ISO_DATE_RE } from "@/lib/import/types"
import type { DraftIssue, DraftTransaction } from "@/lib/import/types"

// ---------------------------------------------------------------------------
// Structural validation for a draft row — lives here (not
// src/server/import/enrich.ts) specifically so it has no server-only
// dependency and can run on the client, live, as the user edits a row.
// Mirrors the field checks in POST /api/transactions/route.ts and the
// commit-time checks in POST /api/transactions/import/route.ts.
// ---------------------------------------------------------------------------

/** Structural checks independent of the server-side enrichment heuristics
 * (duplicate detection, category guessing). Pure function of the row's
 * current fields — call it fresh wherever a row's validity is displayed or
 * decided, rather than trusting a stored copy, so it stays correct as the
 * user edits the row. */
export function validateDraftRow(row: DraftTransaction): DraftIssue[] {
  const issues: DraftIssue[] = []
  if (!row.date || !ISO_DATE_RE.test(row.date)) {
    issues.push({ level: "error", message: "Date is missing or unrecognized" })
  }
  if (!row.merchant.trim()) issues.push({ level: "error", message: "Merchant is required" })
  if (!Number.isFinite(row.amount) || row.amount <= 0) {
    issues.push({ level: "error", message: "Amount must be a positive number" })
  }
  if (!row.category) issues.push({ level: "error", message: "Category is required" })
  return issues
}

/** The full issue list to show/decide on for a row: live structural errors
 * ahead of whatever server-derived findings (duplicate warnings) are stored
 * on `row.issues`. Use this everywhere the UI reads "this row's issues" —
 * never read `row.issues` directly, since it holds only what the server
 * can't be re-derived on the client. */
export function rowIssues(row: DraftTransaction): DraftIssue[] {
  return [...validateDraftRow(row), ...row.issues]
}
