import { importTransactions } from "@/server/mutations/import-transactions"
import { ISO_DATE_RE, TX_STATUSES, TX_TYPES } from "@/lib/import/types"
import type { ImportRow } from "@/lib/import/types"

// Commits a user-confirmed import preview (see .../import/preview/route.ts)
// to the ledger. Validation here mirrors POST /api/transactions/route.ts —
// each row is checked against the same shape a single createTransaction
// call would require — but a bad row is collected into the response's
// `failed` list rather than rejecting the whole request, since one typo in
// row 40 of 200 shouldn't discard the other 199.

const MAX_IMPORT_ROWS = 2000

function badRequest(error: string) {
  return Response.json({ error }, { status: 400 })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const rawRows = body?.rows
  const accountIdRaw = body?.accountId
  const cardIdRaw = body?.cardId

  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    return badRequest("rows must be a non-empty array")
  }
  if (rawRows.length > MAX_IMPORT_ROWS) {
    return badRequest(`rows must not exceed ${MAX_IMPORT_ROWS} entries`)
  }

  let accountId: number | null = null
  if (accountIdRaw !== undefined && accountIdRaw !== null && accountIdRaw !== "") {
    accountId = Number(accountIdRaw)
    if (!Number.isInteger(accountId)) return badRequest("accountId must be an integer")
  }
  let cardId: number | undefined
  if (cardIdRaw !== undefined && cardIdRaw !== null && cardIdRaw !== "") {
    cardId = Number(cardIdRaw)
    if (!Number.isInteger(cardId) || cardId <= 0) return badRequest("cardId must be a positive integer")
  }
  if (accountId == null && cardId == null) {
    return badRequest("accountId or cardId is required")
  }

  const rows: ImportRow[] = []
  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i]
    if (
      typeof r?.date !== "string" ||
      !ISO_DATE_RE.test(r.date) ||
      typeof r?.merchant !== "string" ||
      !r.merchant.trim() ||
      typeof r?.amount !== "number" ||
      !Number.isFinite(r.amount) ||
      r.amount <= 0 ||
      !TX_TYPES.includes(r.type) ||
      typeof r?.category !== "string" ||
      !r.category.trim() ||
      !TX_STATUSES.includes(r.status)
    ) {
      return badRequest(`row ${i} is missing or has an invalid field`)
    }
    rows.push({
      date: r.date,
      merchant: r.merchant.trim(),
      amount: r.amount,
      type: r.type,
      category: r.category.trim(),
      status: r.status,
    })
  }

  try {
    const result = await importTransactions(rows, { accountId, cardId })
    return Response.json(result, { status: 201 })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 404 })
  }
}
