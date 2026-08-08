// ---------------------------------------------------------------------------
// MariBank MariCard credit e-Statement PDF parser. Runs server-side only
// (imported from the preview route handler), since pdfjs-dist is listed in
// next.config.ts's serverExternalPackages and isn't meant to ship to the
// client bundle.
//
// The statement has no ruling lines: each transaction spans several
// tightly-stacked physical text lines (merchant name / description / a
// "Credit Card Transaction" type label), separated from the next
// transaction by a visibly larger vertical gap. This reconstructs the table
// geometrically — column x-boundaries come from the four header labels,
// words are clustered into lines by y-position, lines into transaction
// blocks by vertical gap, then each word is assigned to a column by its
// x-position — the same approach as the pdfplumber prototype this was
// ported from. Deliberately a heuristic tuned to this one issuer's layout,
// not a general table parser: MariBank is the only statement source this
// app supports importing from.
// ---------------------------------------------------------------------------

import type { TextItem } from "pdfjs-dist/types/src/display/api"

import { dayOffset, parseStatementDate } from "@/server/import/normalize"

const COLUMN_LABELS = ["POSTED DATE", "TRANSACTION DATE", "DESCRIPTION", "AMOUNT (PHP)"]
const END_MARKER = "Important Information"
const PAGE_MARKER_RE = /page \d+ of \d+/i

// Statement has no ruling lines: each transaction spans several physical
// text lines tightly stacked, separated from the next transaction by a
// visibly larger gap.
const LINE_CLUSTER_TOLERANCE = 2
const BLOCK_GAP_THRESHOLD = 12
const COLUMN_EPSILON = 1

type Word = { text: string; x0: number; top: number }
type Line = { top: number; words: Word[] }

/** Splits a pdfjs text item into per-word positions. `x0` is a proportional
 * estimate across the item's reported width — in this statement pdfjs
 * already emits one item per table cell, so the split rarely matters, but
 * it keeps column assignment correct if a run ever spans a boundary. `top`
 * converts from pdfjs's bottom-up y (increasing upward) to pdfplumber-style
 * top-down distance from the page top, matching the tolerances ported from
 * the Python prototype. */
function extractWords(items: TextItem[], pageHeight: number): Word[] {
  const words: Word[] = []
  for (const item of items) {
    const str = item.str
    if (!str.trim()) continue
    const x = item.transform[4]
    const top = pageHeight - item.transform[5]
    const perChar = str.length ? item.width / str.length : 0
    const re = /\S+/g
    let m: RegExpExecArray | null
    while ((m = re.exec(str))) {
      words.push({ text: m[0], x0: x + m.index * perChar, top })
    }
  }
  return words
}

function clusterLines(words: Word[]): Line[] {
  const lines: Line[] = []
  for (const word of [...words].sort((a, b) => a.top - b.top || a.x0 - b.x0)) {
    const last = lines[lines.length - 1]
    if (last && Math.abs(word.top - last.top) <= LINE_CLUSTER_TOLERANCE) {
      last.words.push(word)
    } else {
      lines.push({ top: word.top, words: [word] })
    }
  }
  for (const line of lines) line.words.sort((a, b) => a.x0 - b.x0)
  return lines
}

function lineText(line: Line): string {
  return line.words.map((w) => w.text).join(" ")
}

/** Stand-in for pdfplumber's `page.search()`: finds the first line whose
 * reconstructed text matches `needle`, and returns the position of the word
 * containing the match. Needed rather than scanning raw items because some
 * labels (e.g. the "page N of M" footer) are emitted out of x-order and
 * only read correctly after line reconstruction. */
function searchLines(lines: Line[], needle: string | RegExp): { x0: number; top: number } | null {
  for (const line of lines) {
    const text = lineText(line)
    const idx = typeof needle === "string" ? text.indexOf(needle) : (text.match(needle)?.index ?? -1)
    if (idx < 0) continue
    let pos = 0
    for (const word of line.words) {
      if (idx >= pos && idx <= pos + word.text.length) return { x0: word.x0, top: line.top }
      pos += word.text.length + 1
    }
    return { x0: line.words[0].x0, top: line.top }
  }
  return null
}

function getColumnBounds(lines: Line[], pageWidth: number): number[] | null {
  const lefts: number[] = []
  for (const label of COLUMN_LABELS) {
    const found = searchLines(lines, label)
    if (!found) return null
    lefts.push(found.x0)
  }
  return [0, ...lefts.slice(1), pageWidth]
}

function findTableSlice(lines: Line[], pageHeight: number): { top: number; bottom: number; isFinalPage: boolean } | null {
  const header = searchLines(lines, "POSTED DATE")
  if (!header) return null
  const top = header.top

  const end = searchLines(lines, END_MARKER)
  const pageMarker = searchLines(lines, PAGE_MARKER_RE)

  if (end) return { top, bottom: end.top, isFinalPage: true }
  if (pageMarker) return { top, bottom: pageMarker.top, isFinalPage: false }
  return { top, bottom: pageHeight, isFinalPage: false }
}

function columnIndex(bounds: number[], x0: number): number {
  let i = 0
  while (i + 1 < bounds.length && bounds[i + 1] <= x0 + COLUMN_EPSILON) i++
  return Math.min(Math.max(i, 0), 3)
}

function clusterBlocks(lines: Line[]): Line[][] {
  const blocks: Line[][] = []
  for (const line of lines) {
    const last = blocks[blocks.length - 1]
    if (last && line.top - last[last.length - 1].top <= BLOCK_GAP_THRESHOLD) {
      last.push(line)
    } else {
      blocks.push([line])
    }
  }
  return blocks
}

function blockColumns(block: Line[], bounds: number[]): [string, string, string[], string] {
  const cols: Record<0 | 1 | 2 | 3, string[]> = { 0: [], 1: [], 2: [], 3: [] }
  const descLines: string[] = []
  for (const line of block) {
    const lineCols: Record<0 | 1 | 2 | 3, string[]> = { 0: [], 1: [], 2: [], 3: [] }
    for (const word of line.words) {
      lineCols[columnIndex(bounds, word.x0) as 0 | 1 | 2 | 3].push(word.text)
    }
    for (const idx of [0, 1, 2, 3] as const) {
      if (lineCols[idx].length) {
        const text = lineCols[idx].join(" ")
        cols[idx].push(text)
        if (idx === 2) descLines.push(text)
      }
    }
  }
  return [cols[0].join(" ").trim(), cols[1].join(" ").trim(), descLines, cols[3].join(" ").trim()]
}

export type MariBankRow = {
  section: string | null
  postedDate: string
  transactionDate: string
  descriptionLines: string[]
  /** Raw matched money token (e.g. "-238.00"), not yet sign-resolved — the
   * caller runs it through parseMoney() from normalize.ts. MariBank prints
   * amounts already signed (purchases negative, credits positive), unlike
   * some issuers that print everything positive and rely on a separate
   * debit/credit column. */
  amountToken: string
  sourceLine: string
}

export type StatementMeta = {
  periodStart: string | null
  periodEnd: string | null
  statementDate: string | null
  cardLast4: string | null
}

export type MariBankParseResult =
  | { ok: true; rows: MariBankRow[]; meta: StatementMeta }
  | { ok: false; reason: "no-text-layer" | "not-maribank"; sampleLines?: string[] }

const STATEMENT_PERIOD_RE =
  /Statement Period\s*:?\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\s+to\s+(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/i
const CARD_NUMBER_RE = /CARD NUMBER:\s*([\d*]+)/i
const STATEMENT_DATE_RE = /^(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})$/

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

/** Resolves a bare "DD MMM" row date against the statement's own metadata,
 * since MariBank prints transaction dates without a year. Tries the
 * statement's anchor year, then the year before, and keeps whichever lands
 * within 31 days of the anchor — this handles a Dec/Jan statement period
 * without hardcoding which side of the boundary the row falls on. */
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

/** Loads a PDF buffer, locates the transaction table on each page via the
 * four column header labels, and extracts one row per transaction block.
 * Returns `{ ok: false, reason: "no-text-layer" }` for a scanned/image PDF
 * (no OCR here), or `{ ok: false, reason: "not-maribank" }` when no page's
 * header labels could be found at all. */
export async function parseMariBankStatement(data: Uint8Array): Promise<MariBankParseResult> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
  const loadingTask = pdfjs.getDocument({
    data,
    disableFontFace: true,
    useSystemFonts: false,
  })
  const doc = await loadingTask.promise

  const rows: MariBankRow[] = []
  let meta: StatementMeta = { periodStart: null, periodEnd: null, statementDate: null, cardLast4: null }
  let sawAnyText = false
  let sawAnyTable = false
  const sampleLines: string[] = []
  // Carries across pages, not just blocks within a page — a section header
  // like "Purchases" is only printed once, on the page it starts on, so a
  // multi-page section's later rows need to inherit it from a prior page.
  let section: string | null = null

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()
    if (content.items.length > 0) sawAnyText = true

    const items = content.items.filter((it): it is TextItem => "str" in it)
    const words = extractWords(items, viewport.height)
    const allLines = clusterLines(words)

    if (pageNum === 1) meta = extractMeta(allLines)
    if (sampleLines.length < 15) {
      for (const line of allLines) {
        if (sampleLines.length >= 15) break
        sampleLines.push(lineText(line))
      }
    }

    const bounds = getColumnBounds(allLines, viewport.width)
    const tableSlice = findTableSlice(allLines, viewport.height)
    if (!bounds || !tableSlice) continue
    sawAnyTable = true

    const { top, bottom, isFinalPage } = tableSlice
    const slicedWords = words.filter((w) => w.top >= top - 1 && w.top < bottom - LINE_CLUSTER_TOLERANCE)
    let lines = clusterLines(slicedWords)
    lines = lines.filter((line) => Math.abs(line.top - top) > LINE_CLUSTER_TOLERANCE)

    for (const block of clusterBlocks(lines)) {
      const [posted, transactionDate, descLines, amount] = blockColumns(block, bounds)

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

  await loadingTask.destroy()

  if (!sawAnyText) return { ok: false, reason: "no-text-layer" }
  if (!sawAnyTable) return { ok: false, reason: "not-maribank", sampleLines }
  return { ok: true, rows, meta }
}
