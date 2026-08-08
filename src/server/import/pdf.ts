// ---------------------------------------------------------------------------
// Text-layer extraction and line-heuristic parsing for PDF bank statements.
// Runs server-side only (imported from the preview route handler), since
// pdfjs-dist is listed in next.config.ts's serverExternalPackages and isn't
// meant to ship to the client bundle.
//
// This is deliberately a heuristic, not a layout parser: statement PDFs vary
// per issuer, so the extraction is allowed to be wrong — the preview step is
// where the user catches and fixes what it gets wrong.
// ---------------------------------------------------------------------------

const DATE_RE =
  /^(\d{4}-\d{2}-\d{2}|\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4})/
const MONEY_RE = /\(?-?[₱$€£]?\s?\d{1,3}(?:,\d{3})*\.\d{2}\)?(?:\s?(?:CR|DR))?/gi

export type PdfLine = { text: string; page: number }

export type PdfExtractResult =
  | { ok: true; lines: PdfLine[] }
  | { ok: false; reason: "no-text-layer" }

/** Loads a PDF buffer and reconstructs reading-order lines from its text
 * layer. Bucketing by y-position (rounded to whole points) and sorting each
 * bucket by x reassembles a line even when the PDF stores each word as a
 * separate positioned text run, which is the common case for statement
 * exports. Returns { ok: false } when no page has any extractable text —
 * almost always a scanned/image-only PDF, which this heuristic can't help
 * with (no OCR here). */
export async function extractPdfLines(data: Uint8Array): Promise<PdfExtractResult> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
  const loadingTask = pdfjs.getDocument({
    data,
    disableFontFace: true,
    useSystemFonts: false,
  })
  const doc = await loadingTask.promise

  const lines: PdfLine[] = []
  let sawAnyText = false

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum)
    const content = await page.getTextContent()
    if (content.items.length > 0) sawAnyText = true

    const buckets = new Map<number, { x: number; str: string }[]>()
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue
      const y = Math.round(item.transform[5])
      const x = item.transform[4]
      const bucket = buckets.get(y) ?? []
      bucket.push({ x, str: item.str })
      buckets.set(y, bucket)
    }

    // PDF y-coordinates increase upward, so top-of-page-first means
    // descending y.
    const ys = Array.from(buckets.keys()).sort((a, b) => b - a)
    for (const y of ys) {
      const text = buckets
        .get(y)!
        .sort((a, b) => a.x - b.x)
        .map((t) => t.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
      if (text) lines.push({ text, page: pageNum })
    }
  }

  // destroy() lives on the loading task, not the resolved document proxy —
  // it tears down both, releasing the worker-thread resources used to
  // parse this file now that every page's text has been read.
  await loadingTask.destroy()

  if (!sawAnyText) return { ok: false, reason: "no-text-layer" }
  return { ok: true, lines }
}

export type PdfCandidateRow = {
  rawDate: string
  description: string
  /** Raw matched money token (e.g. "1,234.56 CR"), not yet sign-resolved —
   * the caller runs it through parseMoney() from normalize.ts, the same
   * helper the CSV path uses, so both parsers agree on sign handling. */
  amountToken: string
  sourceLine: string
}

/** Turns extracted lines into candidate transaction rows. A line "starts" a
 * new row when it begins with a date; everything up to the first money
 * token is the description, and the last money token on the line is treated
 * as a running balance (near-universal in statement layouts) when two or
 * more are present, leaving the second-to-last as the amount — otherwise
 * the single token found is the amount. Lines with neither a leading date
 * nor any money token are folded into the previous row's description, to
 * capture merchant names that wrap onto a second line. */
export function extractPdfCandidates(lines: PdfLine[]): {
  rows: PdfCandidateRow[]
  unmatchedLines: string[]
} {
  const rows: PdfCandidateRow[] = []
  const unmatchedLines: string[] = []

  for (const { text } of lines) {
    const dateMatch = text.match(DATE_RE)
    const moneyMatches = Array.from(text.matchAll(MONEY_RE)).map((m) => m[0])

    if (dateMatch && dateMatch.index === 0) {
      if (moneyMatches.length === 0) {
        unmatchedLines.push(text)
        continue
      }
      const amountToken = moneyMatches.length >= 2 ? moneyMatches[moneyMatches.length - 2] : moneyMatches[0]
      const firstMoneyIndex = text.indexOf(moneyMatches[0])
      const description = text.slice(dateMatch[0].length, firstMoneyIndex).trim()

      rows.push({ rawDate: dateMatch[0], description, amountToken, sourceLine: text })
    } else if (moneyMatches.length === 0 && rows.length > 0) {
      // Continuation of the previous row's (multi-line) description.
      rows[rows.length - 1].description = `${rows[rows.length - 1].description} ${text}`.trim()
      rows[rows.length - 1].sourceLine = `${rows[rows.length - 1].sourceLine}\n${text}`
    } else {
      unmatchedLines.push(text)
    }
  }

  return { rows, unmatchedLines: unmatchedLines.slice(0, 15) }
}
