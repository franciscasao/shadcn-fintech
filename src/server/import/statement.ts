// ---------------------------------------------------------------------------
// Statement-format dispatch: decodes an uploaded PDF once (via
// pdf-geometry.ts) and hands the reconstructed pages to each known MariBank
// layout in turn, using whichever one recognizes the document. Adding a new
// statement layout means writing a new StatementParser and listing it in
// PARSERS below — nothing else in the import pipeline needs to change.
// ---------------------------------------------------------------------------

import { dayOffset, parseStatementDate } from "@/server/import/normalize"
import { lineText, loadPdfPages, type PdfPage } from "@/server/import/pdf-geometry"
import { maribankCreditParser } from "@/server/import/maribank-credit"
import { maribankSavingsParser } from "@/server/import/maribank-savings"
import type { DraftTransaction } from "@/lib/import/types"

export type StatementMeta = {
  periodStart: string | null
  periodEnd: string | null
  statementDate: string | null
  cardLast4: string | null
}

export type StatementKind = "maribank-credit" | "maribank-savings"

/** One statement layout's recognizer + extractor. `detect` should be cheap
 * and side-effect-free (just a header-label search) since the dispatcher
 * tries every parser in order until one matches. `parse` does the real
 * table-reconstruction work and returns rows already shaped as
 * DraftTransactions, since each layout's raw row shape (single signed
 * amount vs. separate outgoing/incoming columns, etc.) differs enough that
 * a shared intermediate row type wouldn't save anything. */
export type StatementParser = {
  kind: StatementKind
  detect(pages: PdfPage[]): boolean
  parse(pages: PdfPage[]): { rows: DraftTransaction[]; meta: StatementMeta }
}

export type ParseStatementResult =
  | { ok: true; kind: StatementKind; rows: DraftTransaction[]; meta: StatementMeta }
  | { ok: false; reason: "no-text-layer" | "unrecognized"; sampleLines?: string[] }

// Savings before credit: the savings layout's DATE/TRANSACTION/OUTGOING/
// INCOMING labels don't collide with the credit layout's POSTED DATE/
// TRANSACTION DATE/DESCRIPTION/AMOUNT labels, so order doesn't currently
// affect correctness — kept as a list (not a lookup) since detect() is the
// only thing that needs to run before parse() is chosen.
const PARSERS: StatementParser[] = [maribankSavingsParser, maribankCreditParser]

/** Resolves a bare "DD MMM" row date against the statement's own metadata,
 * since MariBank prints transaction dates without a year. Tries the
 * statement's anchor year, then the year before, and keeps whichever lands
 * within 31 days of the anchor — this handles a Dec/Jan statement period
 * without hardcoding which side of the boundary the row falls on. Shared by
 * every parser that produces a StatementMeta. */
export function resolveRowDate(raw: string, meta: StatementMeta): string | null {
  if (!raw) return null

  const direct = parseStatementDate(raw)
  if (direct) return direct

  const anchor = meta.periodEnd ?? meta.statementDate
  if (!anchor) return null

  const anchorYear = Number(anchor.slice(0, 4))
  for (const year of [anchorYear, anchorYear - 1]) {
    const candidate = parseStatementDate(`${raw} ${year}`)
    if (candidate && Math.abs(dayOffset(candidate, anchor)) <= 31) return candidate
  }
  return null
}

/** Loads a PDF buffer once and tries each known statement layout against it.
 * Returns `{ ok: false, reason: "no-text-layer" }` for a scanned/image PDF
 * (no OCR here), or `{ ok: false, reason: "unrecognized" }` when no known
 * parser's header labels could be found on any page. */
export async function parseStatement(data: Uint8Array): Promise<ParseStatementResult> {
  const { pages, sawAnyText } = await loadPdfPages(data)
  if (!sawAnyText) return { ok: false, reason: "no-text-layer" }

  for (const parser of PARSERS) {
    if (!parser.detect(pages)) continue
    const { rows, meta } = parser.parse(pages)
    return { ok: true, kind: parser.kind, rows, meta }
  }

  const sampleLines: string[] = []
  for (const page of pages) {
    for (const line of page.lines) {
      if (sampleLines.length >= 15) break
      sampleLines.push(lineText(line))
    }
    if (sampleLines.length >= 15) break
  }
  return { ok: false, reason: "unrecognized", sampleLines }
}
