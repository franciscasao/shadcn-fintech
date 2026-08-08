// ---------------------------------------------------------------------------
// Shared shapes for the "import transactions from a bank statement" feature.
// Used by both the preview/import route handlers (src/app/api/transactions/
// import/**) and the parsing/enrichment layer (src/server/import/**), plus
// the client-side dialog (src/components/transactions/import/**) — kept
// here rather than in src/server so the client can import the types without
// pulling in server-only code.
// ---------------------------------------------------------------------------

export const TX_TYPES = ["expense", "income"] as const
export const TX_STATUSES = ["completed", "pending", "failed"] as const
export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export type TxType = (typeof TX_TYPES)[number]
export type TxStatus = (typeof TX_STATUSES)[number]

export type DraftIssueLevel = "error" | "warning"

export type DraftIssue = {
  level: DraftIssueLevel
  message: string
}

/** One row of the editable preview table — a candidate transaction the
 * parser extracted, plus whatever the enrichment step (duplicate detection,
 * category guessing) and the user's own edits have layered on top. Nothing
 * in here is written to the database until it's resubmitted as an
 * ImportRow via POST /api/transactions/import. */
export type DraftTransaction = {
  draftId: string
  date: string // ISO yyyy-MM-dd, "" if unparseable
  merchant: string
  amount: number // always positive; sign is carried by `type`
  type: TxType
  category: string // "" if no guess and not yet chosen
  include: boolean
  issues: DraftIssue[]
  /** Set when this row looks like it already exists in the ledger — id of
   * the matching transaction and whether the match is exact or approximate
   * (date ±1 day). Included rows default to `false` when exact. */
  duplicateOf?: { transactionId: string; exact: boolean }
  /** Raw source line(s) this row was extracted from, shown to help the user
   * judge a low-confidence PDF extraction. */
  sourceLine?: string
}

export type PreviewOk = {
  ok: true
  rows: DraftTransaction[]
  /** True when the file has money columns but couldn't be auto-mapped to
   * date/description/amount — the dialog should fall back to a manual
   * column-mapping step and resubmit with `mapping` set. */
  needsMapping?: boolean
  headers?: string[]
  sampleRows?: string[][]
  /** First few raw lines extracted from a PDF that didn't match the
   * transaction-line heuristic, so the failure is visible instead of an
   * empty table with no explanation. */
  unmatchedLines?: string[]
  /** True when the chosen target is a credit card — statements from the
   * issuer typically print purchases positive and payments as CR, the
   * inverse of a deposit account's convention, so the dialog's "flip
   * signs" toggle defaults on in that case. Purely a UI hint; the server
   * doesn't flip anything itself. */
  suggestedFlipSigns?: boolean
}

export type PreviewError = {
  ok: false
  error: string
}

export type PreviewResponse = PreviewOk | PreviewError

/** A user-confirmed row on its way to being written. Same shape as
 * DraftTransaction minus the preview-only bookkeeping (issues, duplicateOf,
 * sourceLine) — those are re-derived server-side rather than trusted from
 * the client. */
export type ImportRow = {
  date: string
  merchant: string
  amount: number
  type: TxType
  category: string
  status: TxStatus
}

export type ImportResult = {
  created: number
  skippedDuplicates: number
  failed: Array<{ index: number; reason: string }>
}

export type ColumnMapping = {
  date: number
  description: number
  amount?: number
  debit?: number
  credit?: number
  balance?: number
}
