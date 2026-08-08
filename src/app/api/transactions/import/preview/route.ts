import { getCategories } from "@/server/queries/categories"
import { getCards } from "@/server/queries/cards"
import {
  extractRows,
  findHeaderRow,
  guessHeaderRowIndex,
  parseDelimited,
} from "@/server/import/csv"
import { extractPdfCandidates, extractPdfLines } from "@/server/import/pdf"
import { parseMoney, parseStatementDate, resolveDateOrder } from "@/server/import/normalize"
import { detectDuplicates, guessCategories, validateDraftRow } from "@/server/import/enrich"
import type { ColumnMapping, DraftTransaction, PreviewResponse } from "@/lib/import/types"

// Parses an uploaded bank statement (CSV or PDF) into an editable preview of
// the transactions it would create — nothing is written to the database
// here. See src/app/api/transactions/import/route.ts for the commit step.

const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_ROWS = 2000

function badRequest(error: string) {
  return Response.json({ ok: false, error } satisfies PreviewResponse, { status: 400 })
}

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
}

type Candidate = { rawDate: string; description: string; amount: number; sourceLine: string }

/** Parses the CSV/TSV branch, returning either extracted candidates or a
 * Response to send straight back (a validation failure, or a needsMapping
 * reply when no header row could be auto-detected). */
function parseCsvCandidates(
  text: string,
  suppliedMapping: ColumnMapping | undefined
): Candidate[] | Response {
  const rows = parseDelimited(text)
  if (rows.length === 0) return badRequest("The file appears to be empty")

  let mapping = suppliedMapping
  let dataRows: string[][]

  if (mapping) {
    // The header row is a pure function of the file's own content (the
    // densest row in the first 20 lines), so re-deriving it here lines up
    // with the `headers` this same file produced on the first, unmapped
    // pass — no need to thread the index back and forth with the client.
    dataRows = rows.slice(guessHeaderRowIndex(rows) + 1)
  } else {
    const detected = findHeaderRow(rows)
    if (!detected) {
      const headerIndex = guessHeaderRowIndex(rows)
      return Response.json({
        ok: true,
        rows: [],
        needsMapping: true,
        headers: rows[headerIndex],
        sampleRows: rows.slice(headerIndex + 1, headerIndex + 6),
      } satisfies PreviewResponse)
    }
    mapping = detected.mapping
    dataRows = rows.slice(detected.headerIndex + 1)
  }

  const candidates = extractRows(dataRows, mapping, parseMoney)
  if (candidates.length === 0) return badRequest("No transaction rows found in this file")
  return candidates
}

async function parsePdfCandidates(file: File): Promise<
  { candidates: Candidate[]; unmatchedLines?: string[] } | Response
> {
  const data = new Uint8Array(await file.arrayBuffer())
  const extracted = await extractPdfLines(data)
  if (!extracted.ok) {
    return badRequest(
      "This PDF has no text layer (likely a scan) — export a CSV from your bank instead."
    )
  }

  const { rows: pdfRows, unmatchedLines } = extractPdfCandidates(extracted.lines)
  const candidates = pdfRows.map((r) => ({
    rawDate: r.rawDate,
    description: r.description,
    amount: parseMoney(r.amountToken) ?? 0,
    sourceLine: r.sourceLine,
  }))
  return { candidates, unmatchedLines: candidates.length === 0 ? unmatchedLines : undefined }
}

export async function POST(request: Request): Promise<Response> {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return badRequest("Expected multipart form data")
  }

  const file = form.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return badRequest("A statement file is required")
  }
  if (file.size > MAX_FILE_BYTES) {
    return badRequest(`File must be under ${MAX_FILE_BYTES / (1024 * 1024)} MB`)
  }

  const accountIdRaw = form.get("accountId")
  const cardIdRaw = form.get("cardId")
  let cardId: number | undefined
  if (typeof cardIdRaw === "string" && cardIdRaw !== "") {
    cardId = Number(cardIdRaw)
    if (!Number.isInteger(cardId)) return badRequest("cardId must be an integer")
  }
  let accountId: number | null = null
  if (typeof accountIdRaw === "string" && accountIdRaw !== "") {
    accountId = Number(accountIdRaw)
    if (!Number.isInteger(accountId)) return badRequest("accountId must be an integer")
  }
  if (accountId == null && cardId == null) {
    return badRequest("Choose a target account or card before previewing")
  }

  let mapping: ColumnMapping | undefined
  const mappingRaw = form.get("mapping")
  if (typeof mappingRaw === "string" && mappingRaw !== "") {
    try {
      mapping = JSON.parse(mappingRaw)
    } catch {
      return badRequest("mapping must be valid JSON")
    }
    if (typeof mapping?.date !== "number" || typeof mapping?.description !== "number") {
      return badRequest("mapping must include date and description column indexes")
    }
  }

  let candidates: Candidate[]
  let unmatchedLines: string[] | undefined

  if (isPdf(file)) {
    const result = await parsePdfCandidates(file)
    if (result instanceof Response) return result
    candidates = result.candidates
    unmatchedLines = result.unmatchedLines
  } else {
    const result = parseCsvCandidates(await file.text(), mapping)
    if (result instanceof Response) return result
    candidates = result
  }

  if (candidates.length > MAX_ROWS) {
    return badRequest(`This statement has more than ${MAX_ROWS} rows — split it and import in batches`)
  }

  const preferDayFirst = resolveDateOrder(candidates.map((c) => c.rawDate))
  const draftRows: DraftTransaction[] = candidates.map((c, i) => ({
    draftId: `row-${i}`,
    date: parseStatementDate(c.rawDate, preferDayFirst) ?? "",
    merchant: c.description.trim(),
    amount: Math.abs(c.amount),
    type: c.amount < 0 ? "expense" : "income",
    category: "",
    include: true,
    issues: [],
    sourceLine: c.sourceLine,
  }))

  const [categoryRows, cards] = await Promise.all([getCategories(), getCards()])
  const categoryNames = categoryRows.map((c) => c.name)

  detectDuplicates(draftRows)
  guessCategories(draftRows, categoryNames)
  for (const row of draftRows) {
    row.issues = [...validateDraftRow(row), ...row.issues]
  }

  const card = cardId != null ? cards.find((c) => c.id === String(cardId)) : undefined

  return Response.json({
    ok: true,
    rows: draftRows,
    unmatchedLines,
    suggestedFlipSigns: card?.product === "credit",
  } satisfies PreviewResponse)
}
