// ---------------------------------------------------------------------------
// MariBank Savings e-Statement PDF parser.
//
// Two tables matter here, both repeating their column headers on every page
// they span (same convention as the credit statement) but otherwise laid
// out differently from it:
//
//  - "SAVINGS - TRANSACTION DETAILS": DATE | TRANSACTION | OUTGOING (PHP) |
//    INCOMING (PHP). A signed amount isn't printed — money moves into
//    whichever of the two amount columns applies — and each row spans two
//    physical lines (merchant, then a subtype label like "Card Payment" /
//    "Reward" / "Transfer"). DATE/OUTGOING/INCOMING are single values per
//    row but the row is two lines tall, and which of the two lines they're
//    vertically aligned with isn't reliable (observed: they can land next
//    to the *second* line, not the merchant line) — so unlike a "does this
//    line have a date" heuristic, rows are split by vertical gap, the same
//    approach the credit statement parser uses, and blockColumns()
//    aggregates DATE/OUTGOING/INCOMING across every line in the block
//    regardless of which one actually carries them.
//  - "SAVINGS - INTEREST & TAX DETAILS*": DATE | PREVIOUS DAY BALANCE |
//    GROSS INTEREST | WITHHOLDING TAX | INTEREST, one row per calendar day,
//    each a single physical line — no gap clustering needed, just one row
//    per line. The transaction table's own daily/monthly interest line has
//    no day number (just "JUL"), so it's unresolvable as a row date and is
//    dropped; this table's net INTEREST column is summed instead into a
//    single income row dated the last day it covers.
// ---------------------------------------------------------------------------

import { blockColumns, clusterBlocks, columnBounds, findHeaderLine, lineText, searchLines, type Line, type PdfPage } from "@/server/import/pdf-geometry"
import { parseMoney, parseStatementDate } from "@/server/import/normalize"
import { resolveRowDate, type StatementMeta, type StatementParser } from "@/server/import/statement"
import type { DraftTransaction } from "@/lib/import/types"

const TX_COLUMN_LABELS = ["DATE", "TRANSACTION", "OUTGOING (PHP)", "INCOMING (PHP)"]
const INTEREST_COLUMN_LABELS = ["DATE", "PREVIOUS DAY BALANCE", "GROSS INTEREST", "WITHHOLDING TAX", "INTEREST"]
const PAGE_MARKER_RE = /page \d+ of \d+/i
const STATEMENT_DATE_RE = /^(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})$/
// The units line under the interest table's numeric column headers (e.g.
// "PREVIOUS DAY BALANCE" / "(PHP)" on two physical lines) — the transaction
// table's headers don't wrap this way, but strip it wherever it shows up.
const PHP_SUBHEADER_RE = /^(\(PHP\)\s*)+$/
// Vertical gap (pt) beyond which two lines belong to different transaction
// rows rather than the same one's merchant/subtype pair — same value as the
// credit statement's BLOCK_GAP_THRESHOLD, since it's the same issuer's
// table styling. TODO: confirm against a real savings PDF (only tested
// against a hand-built synthetic one so far) and retune if rows merge or
// split incorrectly.
const BLOCK_GAP_THRESHOLD = 12

const LINE_CLUSTER_TOLERANCE = 2
const COLUMN_EPSILON = 1

/** Maps a transaction's subtype label (the second line of the TRANSACTION
 * cell) to a category name, for rows where the label alone is a strong
 * enough signal — e.g. a "Transfer" is basically never miscategorized.
 * "Net Interest" isn't listed here: it only ever labels the month-only
 * summary row, which has no day number and so gets dropped in parse() below
 * (resolveRowDate returns null) before this hint would apply — the summed
 * interest row built separately in parse() sets its categoryHint directly
 * instead. Only names that exist in the taxonomy
 * (src/server/db/reference.ts) are used; guessCategories() re-validates
 * against the user's real categories regardless, so a renamed/deleted
 * category just means no hint applies. */
const SUBTYPE_CATEGORY_HINTS: Record<string, string> = {
  Reward: "Income",
  Transfer: "Transfer",
}

function findSlice(lines: Line[], labels: string[], pageHeight: number): { top: number; bottom: number } | null {
  const header = findHeaderLine(lines, labels)
  if (!header) return null
  const pageMarker = searchLines(lines, PAGE_MARKER_RE)
  return { top: header.top, bottom: pageMarker ? pageMarker.top : pageHeight }
}

function sliceTableLines(lines: Line[], top: number, bottom: number): Line[] {
  let sliced = lines.filter((line) => line.top >= top - 1 && line.top < bottom - LINE_CLUSTER_TOLERANCE)
  sliced = sliced.filter((line) => Math.abs(line.top - top) > LINE_CLUSTER_TOLERANCE)
  sliced = sliced.filter((line) => !PHP_SUBHEADER_RE.test(lineText(line).trim()))
  return sliced
}

function extractMeta(lines: Line[]): StatementMeta {
  let statementDate: string | null = null
  for (const line of lines) {
    if (statementDate) break
    const match = lineText(line).match(STATEMENT_DATE_RE)
    if (match) statementDate = parseStatementDate(match[1])
  }
  return { periodStart: null, periodEnd: null, statementDate, cardLast4: null }
}

type SavingsTxRow = {
  dateCell: string
  merchant: string
  subtype: string
  amountToken: string
  type: "expense" | "income"
  sourceLine: string
}

function extractTransactionRows(page: PdfPage): SavingsTxRow[] {
  const bounds = columnBounds(page.lines, page.width, TX_COLUMN_LABELS)
  const slice = findSlice(page.lines, TX_COLUMN_LABELS, page.height)
  if (!bounds || !slice) return []

  const lines = sliceTableLines(page.lines, slice.top, slice.bottom)
  const rows: SavingsTxRow[] = []

  for (const block of clusterBlocks(lines, BLOCK_GAP_THRESHOLD)) {
    const [dateCol, transactionCol, outgoingCol, incomingCol] = blockColumns(block, bounds, COLUMN_EPSILON)
    const dateCell = (dateCol[0] ?? "").trim()
    const merchant = (transactionCol[0] ?? "").trim()
    const subtype = (transactionCol[1] ?? "").trim()
    const outgoing = outgoingCol.join(" ").trim()
    const incoming = incomingCol.join(" ").trim()

    if (!merchant) continue // malformed block — template may need review
    if (!!outgoing === !!incoming) continue // both or neither amount column filled — malformed

    rows.push({
      dateCell,
      merchant,
      subtype,
      amountToken: outgoing || incoming,
      type: outgoing ? "expense" : "income",
      sourceLine: block.map(lineText).join("\n"),
    })
  }

  return rows
}

/** Sums the net INTEREST column across every physical row of the interest
 * table found on this page, and returns the last (latest) row date seen —
 * the interest parser doesn't need per-row output, just the running total
 * and an anchor date for the single summed row the caller emits. Each row
 * is exactly one physical line (no merchant/subtype wrapping like the
 * transaction table), so no block clustering is needed here. */
function extractInterestTotal(page: PdfPage): { total: number; lastDateCell: string | null } {
  const bounds = columnBounds(page.lines, page.width, INTEREST_COLUMN_LABELS)
  const slice = findSlice(page.lines, INTEREST_COLUMN_LABELS, page.height)
  if (!bounds || !slice) return { total: 0, lastDateCell: null }

  const lines = sliceTableLines(page.lines, slice.top, slice.bottom)
  let total = 0
  let lastDateCell: string | null = null

  for (const line of lines) {
    const columns = blockColumns([line], bounds, COLUMN_EPSILON)
    const dateCell = (columns[0]?.[0] ?? "").trim()
    const netInterest = parseMoney((columns[4] ?? []).join(" ").trim())
    if (!dateCell || netInterest == null) continue
    total += netInterest
    lastDateCell = dateCell
  }

  return { total, lastDateCell }
}

function extractAll(pages: PdfPage[]): { rows: SavingsTxRow[]; interestTotal: number; interestDateCell: string | null; meta: StatementMeta } {
  const rows: SavingsTxRow[] = []
  let interestTotal = 0
  let interestDateCell: string | null = null
  let meta: StatementMeta = { periodStart: null, periodEnd: null, statementDate: null, cardLast4: null }

  pages.forEach((page, pageNum) => {
    if (pageNum === 0) meta = extractMeta(page.lines)

    const txRows = extractTransactionRows(page)
    if (txRows.length > 0) {
      rows.push(...txRows)
      return // a page belongs to one table; don't also probe it for the other
    }

    const interest = extractInterestTotal(page)
    if (interest.lastDateCell) {
      interestTotal += interest.total
      interestDateCell = interest.lastDateCell
    }
  })

  return { rows, interestTotal, interestDateCell, meta }
}

export const maribankSavingsParser: StatementParser = {
  kind: "maribank-savings",

  detect(pages) {
    return pages.some((page) => columnBounds(page.lines, page.width, TX_COLUMN_LABELS) !== null)
  },

  parse(pages) {
    const { rows, interestTotal, interestDateCell, meta } = extractAll(pages)

    const draftRows: DraftTransaction[] = []
    rows.forEach((r, i) => {
      const date = resolveRowDate(r.dateCell, meta)
      if (!date) return // e.g. an unresolvable date — drop rather than guess
      const amount = Math.abs(parseMoney(r.amountToken) ?? 0)
      draftRows.push({
        draftId: `row-${i}`,
        date,
        merchant: r.merchant,
        amount,
        type: r.type,
        category: "",
        categoryHint: SUBTYPE_CATEGORY_HINTS[r.subtype],
        include: true,
        issues: [],
        sourceLine: r.sourceLine,
      })
    })

    const roundedInterest = Math.round(interestTotal * 100) / 100
    if (roundedInterest !== 0) {
      const date = interestDateCell ? resolveRowDate(interestDateCell, meta) : null
      if (date) {
        draftRows.push({
          draftId: `row-interest`,
          date,
          merchant: "Interest",
          amount: Math.abs(roundedInterest),
          type: roundedInterest < 0 ? "expense" : "income",
          category: "",
          categoryHint: "Income",
          include: true,
          issues: [],
          sourceLine: "Summed from SAVINGS - INTEREST & TAX DETAILS",
        })
      }
    }

    return { rows: draftRows, meta }
  },
}
