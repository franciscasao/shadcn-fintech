// ---------------------------------------------------------------------------
// Generic PDF table-reconstruction primitives shared by every statement
// parser under src/server/import/ (currently the two MariBank layouts:
// maribank-credit.ts and maribank-savings.ts). Server-side only — pdfjs-dist
// is listed in next.config.ts's serverExternalPackages and isn't meant to
// ship to the client bundle.
//
// None of this knows what a "transaction" or a "column label" is. Each
// parser supplies its own header labels, section markers, and row-grouping
// rule; this module only turns a PDF's text items into positioned words,
// words into physical lines, and (given column boundaries) lines into
// per-column cell text. Ported from a pdfplumber prototype, hence the
// top-down (not pdfjs's bottom-up) y-coordinate convention throughout.
// ---------------------------------------------------------------------------

import type { TextItem } from "pdfjs-dist/types/src/display/api"

export type Word = { text: string; x0: number; top: number }
export type Line = { top: number; words: Word[] }
export type PdfPage = { lines: Line[]; width: number; height: number }

/** Splits a pdfjs text item into per-word positions. `x0` is a proportional
 * estimate across the item's reported width — statements like this tend to
 * emit one item per table cell, so the split rarely matters, but it keeps
 * column assignment correct if a run ever spans a boundary. `top` converts
 * from pdfjs's bottom-up y (increasing upward) to pdfplumber-style top-down
 * distance from the page top. */
export function extractWords(items: TextItem[], pageHeight: number): Word[] {
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

/** Groups words into physical lines by y-position: a word joins the
 * previous line when it's within `tolerance` of that line's top, otherwise
 * it starts a new line. Compares against the line's original top (the first
 * word clustered into it), not a running mean, so the cluster can't drift as
 * more words are added. */
export function clusterLines(words: Word[], tolerance: number): Line[] {
  const lines: Line[] = []
  for (const word of [...words].sort((a, b) => a.top - b.top || a.x0 - b.x0)) {
    const last = lines[lines.length - 1]
    if (last && Math.abs(word.top - last.top) <= tolerance) {
      last.words.push(word)
    } else {
      lines.push({ top: word.top, words: [word] })
    }
  }
  for (const line of lines) line.words.sort((a, b) => a.x0 - b.x0)
  return lines
}

export function lineText(line: Line): string {
  return line.words.map((w) => w.text).join(" ")
}

/** Stand-in for pdfplumber's `page.search()`: finds the first line whose
 * reconstructed text matches `needle`, and returns the position of the word
 * containing the match. Needed rather than scanning raw items because some
 * labels (e.g. a "page N of M" footer) are emitted out of x-order and only
 * read correctly after line reconstruction. */
/** Maps a character offset into `lineText(line)` back to the word that
 * contains it, so a text match found via string/regex search can be turned
 * back into a position. Falls back to null (not the line's first word) when
 * the offset lands in the joining space between words rather than inside
 * one — callers that want a position regardless can fall back themselves. */
function wordAtOffset(line: Line, charIndex: number): Word | null {
  let pos = 0
  for (const word of line.words) {
    if (charIndex >= pos && charIndex <= pos + word.text.length) return word
    pos += word.text.length + 1
  }
  return null
}

export function searchLines(lines: Line[], needle: string | RegExp): { x0: number; top: number } | null {
  for (const line of lines) {
    const text = lineText(line)
    const idx = typeof needle === "string" ? text.indexOf(needle) : (text.match(needle)?.index ?? -1)
    if (idx < 0) continue
    const word = wordAtOffset(line, idx)
    return { x0: word ? word.x0 : line.words[0].x0, top: line.top }
  }
  return null
}

/** Groups lines into blocks (e.g. one transaction's tightly-stacked
 * merchant/description lines) by vertical gap: a line joins the previous
 * block when it's within `gapThreshold` of the last line already in that
 * block, otherwise it starts a new block. */
export function clusterBlocks(lines: Line[], gapThreshold: number): Line[][] {
  const blocks: Line[][] = []
  for (const line of lines) {
    const last = blocks[blocks.length - 1]
    if (last && line.top - last[last.length - 1].top <= gapThreshold) {
      last.push(line)
    } else {
      blocks.push([line])
    }
  }
  return blocks
}

/** Finds the header row: the first physical line whose text contains every
 * one of `labels`. Requiring all of them on the *same* line (rather than
 * searching for each independently anywhere on the page) matters because a
 * section title can legitimately contain one column's label as an ordinary
 * word — e.g. MariBank's savings statement titles its transaction table
 * "SAVINGS - TRANSACTION DETAILS", and "TRANSACTION" is also that table's
 * own column header. Searching page-wide for "TRANSACTION" alone finds the
 * title first and silently derives the wrong column bounds from it; only
 * the true header row has all the labels together. */
export function findHeaderLine(lines: Line[], labels: string[]): Line | null {
  return lines.find((line) => labels.every((label) => lineText(line).includes(label))) ?? null
}

/** Derives column x-boundaries from the header row (see findHeaderLine).
 * Returns null if no line contains every label — the caller uses that to
 * detect "this isn't the layout I'm looking for". Labels are located with a
 * left-to-right cursor over the header row's text — each label's search
 * starts right after where the previous one matched — rather than an
 * independent indexOf() per label, because one label can be a substring of
 * an earlier one on the same row (MariBank's savings interest table has
 * both "GROSS INTEREST" and a later standalone "INTEREST" column; searching
 * for "INTEREST" from the start of the line would find the one inside
 * "GROSS INTEREST" instead). The first label's own x is discarded in favor
 * of 0, so column 0 extends to the left page edge; the last bound is
 * `pageWidth`. */
export function columnBounds(lines: Line[], pageWidth: number, labels: string[]): number[] | null {
  const header = findHeaderLine(lines, labels)
  if (!header) return null

  const text = lineText(header)
  const lefts: number[] = []
  let searchFrom = 0
  for (const label of labels) {
    const idx = text.indexOf(label, searchFrom)
    if (idx < 0) return null
    const word = wordAtOffset(header, idx)
    lefts.push(word ? word.x0 : header.words[0].x0)
    searchFrom = idx + label.length
  }
  return [0, ...lefts.slice(1), pageWidth]
}

/** Maps an x-position to a column index given `bounds` (length = columns +
 * 1, as returned by columnBounds), clamped to the last column so stray
 * words slightly past the final boundary still land somewhere sane. */
export function columnIndex(bounds: number[], x0: number, epsilon: number): number {
  let i = 0
  while (i + 1 < bounds.length && bounds[i + 1] <= x0 + epsilon) i++
  return Math.min(Math.max(i, 0), bounds.length - 2)
}

/** Assigns every word in a block to a column by x-position and joins each
 * line's words per column, returning one array of cell-lines per column
 * (outer index = column, inner = one entry per physical line that had text
 * in that column). Callers pick indices for the columns they care about;
 * a multi-line column (e.g. a wrapped description) is just the array with
 * more than one entry. */
export function blockColumns(block: Line[], bounds: number[], epsilon: number): string[][] {
  const columnCount = bounds.length - 1
  const cols: string[][] = Array.from({ length: columnCount }, () => [])
  for (const line of block) {
    const lineCols: string[][] = Array.from({ length: columnCount }, () => [])
    for (const word of line.words) {
      lineCols[columnIndex(bounds, word.x0, epsilon)].push(word.text)
    }
    for (let idx = 0; idx < columnCount; idx++) {
      if (lineCols[idx].length) cols[idx].push(lineCols[idx].join(" "))
    }
  }
  return cols
}

/** pdfjs-dist's legacy Node build references `DOMMatrix`/`Path2D` at
 * module-evaluation time (e.g. a top-level `new DOMMatrix()`), not just when
 * actually rendering to a canvas — so importing it throws `ReferenceError`
 * unless those globals exist, even though this module only ever calls
 * `getTextContent()`. pdfjs normally sources these from its optional
 * `@napi-rs/canvas` dependency, but that's a native, platform-specific
 * package pulled in via a runtime-constructed `require()` that Next's
 * output-file-tracing can't see through, so it silently doesn't make it into
 * the standalone Docker build. Real canvas rendering is never exercised
 * here, so a stub good enough not to throw is sufficient; skip it if a real
 * implementation (e.g. `@napi-rs/canvas` present, as in local dev) is
 * already on globalThis. */
function ensurePdfjsNodeGlobals(): void {
  if (typeof globalThis.DOMMatrix === "undefined") {
    globalThis.DOMMatrix = class DOMMatrix {} as unknown as typeof DOMMatrix
  }
  if (typeof globalThis.Path2D === "undefined") {
    globalThis.Path2D = class Path2D {} as unknown as typeof Path2D
  }
}

/** Loads a PDF buffer and reconstructs each page into positioned lines.
 * `sawAnyText` is true when pdfjs extracted any text content at all — false
 * means a scanned/image PDF with no text layer (no OCR here), which every
 * parser should treat as an immediate failure rather than "wrong layout". */
export async function loadPdfPages(data: Uint8Array): Promise<{ pages: PdfPage[]; sawAnyText: boolean }> {
  ensurePdfjsNodeGlobals()
  // pdfjs has no real Worker thread in Node, so it falls back to an in-process
  // "fake worker" that by default dynamically imports a sibling
  // legacy/build/pdf.worker.mjs by string path — another file Next's
  // output-file-tracing misses (same root cause as the DOMMatrix issue
  // above), which crashes with "Setting up fake worker failed: Cannot find
  // module ... pdf.worker.mjs". Importing it here ourselves, as a normal
  // static import Next's tracer *can* see, and exposing it the way pdfjs
  // checks for a pre-loaded worker (`globalThis.pdfjsWorker`) skips that
  // dynamic import entirely.
  // @ts-expect-error - pdfjs-dist ships no type declarations for this subpath
  const pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs")
  ;(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = pdfjsWorker
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
  const loadingTask = pdfjs.getDocument({
    data,
    disableFontFace: true,
    useSystemFonts: false,
  })
  const doc = await loadingTask.promise

  const pages: PdfPage[] = []
  let sawAnyText = false

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()
    if (content.items.length > 0) sawAnyText = true

    const items = content.items.filter((it): it is TextItem => "str" in it)
    const words = extractWords(items, viewport.height)
    pages.push({ lines: clusterLines(words, 2), width: viewport.width, height: viewport.height })
  }

  await loadingTask.destroy()
  return { pages, sawAnyText }
}
