import { getCategories } from "@/server/queries/categories"
import { getCards } from "@/server/queries/cards"
import { parseStatement } from "@/server/import/statement"
import { detectDuplicates, guessCategories, validateDraftRow } from "@/server/import/enrich"
import type { PreviewResponse } from "@/lib/import/types"

// Parses an uploaded MariBank e-Statement PDF (credit card or savings — see
// src/server/import/statement.ts for how the layout is auto-detected) into
// an editable preview of the transactions it would create — nothing is
// written to the database here. See src/app/api/transactions/import/route.ts
// for the commit step.

const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_ROWS = 2000

function badRequest(error: string) {
  return Response.json({ ok: false, error } satisfies PreviewResponse, { status: 400 })
}

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
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
  if (!isPdf(file)) {
    return badRequest("Only MariBank e-Statement PDFs (credit card or savings) are supported right now")
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

  const data = new Uint8Array(await file.arrayBuffer())
  const parsed = await parseStatement(data)
  if (!parsed.ok) {
    if (parsed.reason === "no-text-layer") {
      return badRequest(
        "This PDF has no text layer (likely a scan) — download the e-Statement PDF from the MariBank app instead."
      )
    }
    // "unrecognized" — no known layout's header labels were found anywhere
    // in the file. Rather than a bare error, route through the same
    // empty-rows + unmatchedLines display the review step already has, so
    // the user can see what was actually read instead of just being told
    // it failed.
    return Response.json({
      ok: true,
      rows: [],
      unmatchedLines: parsed.sampleLines,
    } satisfies PreviewResponse)
  }

  if (parsed.rows.length > MAX_ROWS) {
    return badRequest(`This statement has more than ${MAX_ROWS} rows — split it and import in batches`)
  }
  if (parsed.rows.length === 0) {
    return badRequest("No transaction rows found in this file")
  }

  const draftRows = parsed.rows

  const [categoryRows, cards] = await Promise.all([getCategories(), getCards()])
  const categoryNames = categoryRows.map((c) => c.name)

  detectDuplicates(draftRows)
  guessCategories(draftRows, categoryNames)
  for (const row of draftRows) {
    row.issues = [...validateDraftRow(row), ...row.issues]
  }

  const card = cardId != null ? cards.find((c) => c.id === String(cardId)) : undefined
  const notice =
    card && parsed.meta.cardLast4 && card.last4 !== parsed.meta.cardLast4
      ? `This statement is for card ••••${parsed.meta.cardLast4}, but you're importing into ••••${card.last4}.`
      : undefined

  return Response.json({
    ok: true,
    rows: draftRows,
    notice,
  } satisfies PreviewResponse)
}
