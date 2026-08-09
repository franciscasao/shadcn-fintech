// ---------------------------------------------------------------------------
// MariBank MariCard credit e-Statement PDF parser.
//
// The statement has no ruling lines: each transaction spans several
// tightly-stacked physical text lines (merchant name / description / a
// "Credit Card Transaction" type label), separated from the next
// transaction by a visibly larger vertical gap. This reconstructs the table
// geometrically — column x-boundaries come from the four header labels,
// lines are grouped into transaction blocks by vertical gap, then each
// word is assigned to a column by its x-position — using the shared
// primitives in pdf-geometry.ts. Deliberately a heuristic tuned to this
// one issuer's layout, not a general table parser.
// ---------------------------------------------------------------------------

import { blockColumns, clusterBlocks, columnBounds, findHeaderLine, lineText, searchLines, type Line, type PdfPage } from "@/server/import/pdf-geometry"
import { parseMoney, parseStatementDate } from "@/server/import/normalize"
import { resolveRowDate, type StatementMeta, type StatementParser } from "@/server/import/statement"
import type { DraftTransaction } from "@/lib/import/types"

const COLUMN_LABELS = ["POSTED DATE", "TRANSACTION DATE", "DESCRIPTION", "AMOUNT (PHP)"]
const END_MARKER = "Important Information"
const PAGE_MARKER_RE = /page \d+ of \d+/i

// Statement has no ruling lines: each transaction spans several physical
// text lines tightly stacked, separated from the next transaction by a
// visibly larger gap.
const LINE_CLUSTER_TOLERANCE = 2
const BLOCK_GAP_THRESHOLD = 12
const COLUMN_EPSILON = 1

const STATEMENT_PERIOD_RE =
  /Statement Period\s*:?\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\s+to\s+(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/i
const CARD_NUMBER_RE = /CARD NUMBER:\s*([\d*]+)/i
const STATEMENT_DATE_RE = /^(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})$/

type CreditRow = {
  section: string | null
  postedDate: string
  transactionDate: string
  descriptionLines: string[]
  /** Raw matched money token (e.g. "-238.00"), not yet sign-resolved — run
   * through parseMoney() below. MariBank prints amounts already signed
   * (purchases negative, credits positive), unlike some issuers that print
   * everything positive and rely on a separate debit/credit column. */
  amountToken: string
  sourceLine: string
}

function findTableSlice(lines: Line[], pageHeight: number): { top: number; bottom: number; isFinalPage: boolean } | null {
  const header = findHeaderLine(lines, COLUMN_LABELS)
  if (!header) return null
  const top = header.top

  const end = searchLines(lines, END_MARKER)
  const pageMarker = searchLines(lines, PAGE_MARKER_RE)

  if (end) return { top, bottom: end.top, isFinalPage: true }
  if (pageMarker) return { top, bottom: pageMarker.top, isFinalPage: false }
  return { top, bottom: pageHeight, isFinalPage: false }
}

function extractMeta(lines: Line[]): StatementMeta {
  let periodStart: string | null = null
  let periodEnd: string | null = null
  let statementDate: string | null = null
  let cardLast4: string | null = null

  for (const line of lines) {
    const text = lineText(line)

    const period = text.match(STATEMENT_PERIOD_RE)
    if (period) {
      periodStart = parseStatementDate(period[1])
      periodEnd = parseStatementDate(period[2])
    }

    const card = text.match(CARD_NUMBER_RE)
    if (card) {
      const digits = card[1].replace(/\D/g, "")
      cardLast4 = digits.slice(-4) || null
    }

    if (!statementDate) {
      const dateMatch = text.match(STATEMENT_DATE_RE)
      if (dateMatch) statementDate = parseStatementDate(dateMatch[1])
    }
  }

  return { periodStart, periodEnd, statementDate, cardLast4 }
}

function extractRows(pages: PdfPage[]): { rows: CreditRow[]; meta: StatementMeta } {
  const rows: CreditRow[] = []
  let meta: StatementMeta = { periodStart: null, periodEnd: null, statementDate: null, cardLast4: null }
  // Carries across pages, not just blocks within a page — a section header
  // like "Purchases" is only printed once, on the page it starts on, so a
  // multi-page section's later rows need to inherit it from a prior page.
  let section: string | null = null

  for (let pageNum = 0; pageNum < pages.length; pageNum++) {
    const page = pages[pageNum]
    if (pageNum === 0) meta = extractMeta(page.lines)

    const bounds = columnBounds(page.lines, page.width, COLUMN_LABELS)
    const tableSlice = findTableSlice(page.lines, page.height)
    if (!bounds || !tableSlice) continue

    const { top, bottom, isFinalPage } = tableSlice
    let lines = page.lines.filter((line) => line.top >= top - 1 && line.top < bottom - LINE_CLUSTER_TOLERANCE)
    lines = lines.filter((line) => Math.abs(line.top - top) > LINE_CLUSTER_TOLERANCE)

    for (const block of clusterBlocks(lines, BLOCK_GAP_THRESHOLD)) {
      const [postedCol, transactionCol, descCol, amountCol] = blockColumns(block, bounds, COLUMN_EPSILON)
      const posted = (postedCol ?? []).join(" ").trim()
      const transactionDate = (transactionCol ?? []).join(" ").trim()
      const descLines = descCol ?? []
      const amount = (amountCol ?? []).join(" ").trim()

      if (!posted && !amount) {
        section = [transactionDate, ...descLines].join(" ").trim()
        continue
      }
      if (!posted || !amount) continue // malformed block — template may need review

      rows.push({
        section,
        postedDate: posted,
        transactionDate,
        descriptionLines: descLines,
        amountToken: amount,
        sourceLine: block.map(lineText).join("\n"),
      })
    }

    if (isFinalPage) break
  }

  return { rows, meta }
}

export const maribankCreditParser: StatementParser = {
  kind: "maribank-credit",

  detect(pages) {
    return pages.some((page) => columnBounds(page.lines, page.width, COLUMN_LABELS) !== null)
  },

  parse(pages) {
    const { rows, meta } = extractRows(pages)
    const draftRows: DraftTransaction[] = rows.map((r, i) => {
      const signed = parseMoney(r.amountToken) ?? 0
      return {
        draftId: `row-${i}`,
        date: resolveRowDate(r.postedDate || r.transactionDate, meta) ?? "",
        merchant: (r.descriptionLines[0] ?? "").trim(),
        amount: Math.abs(signed),
        type: signed < 0 ? "expense" : "income",
        category: "",
        include: true,
        issues: [],
        sourceLine: r.sourceLine,
      }
    })
    return { rows: draftRows, meta }
  },
}
