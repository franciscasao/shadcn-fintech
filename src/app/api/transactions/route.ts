import {
  clampPageSize,
  getTransactionsPage,
  type TransactionFilters,
} from "@/server/queries/transactions"
import {
  createTransaction,
  deleteTransactions,
  type NewTransactionInput,
} from "@/server/mutations/transactions"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const filters: TransactionFilters = {
    search: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    type: searchParams.get("type") ?? undefined,
  }
  const page = Number(searchParams.get("page")) || 1
  const pageSize = clampPageSize(Number(searchParams.get("size")) || 25)

  const transactionsPage = await getTransactionsPage(filters, { page, pageSize })
  return Response.json(transactionsPage)
}

const TYPES = ["expense", "income"] as const
const STATUSES = ["completed", "pending", "failed"] as const
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function badRequest(error: string) {
  return Response.json({ error }, { status: 400 })
}

export async function POST(request: Request) {
  const body = await request.json()
  const {
    merchant,
    amount,
    type,
    category,
    date,
    accountId,
    cardId,
    status,
    notes,
  } = body ?? {}

  if (typeof merchant !== "string" || !merchant.trim()) {
    return badRequest("merchant is required")
  }
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return badRequest("amount must be a positive number")
  }
  if (!TYPES.includes(type)) {
    return badRequest("type must be one of expense, income")
  }
  if (typeof category !== "string" || !category.trim()) {
    return badRequest("category is required")
  }
  if (typeof date !== "string" || !ISO_DATE.test(date)) {
    return badRequest("date must be an ISO yyyy-MM-dd string")
  }
  const resolvedAccountId = Number(accountId)
  if (!Number.isInteger(resolvedAccountId)) {
    return badRequest("accountId is required")
  }
  let resolvedCardId: number | undefined
  if (cardId !== undefined && cardId !== null && cardId !== "") {
    resolvedCardId = Number(cardId)
    if (!Number.isInteger(resolvedCardId) || resolvedCardId <= 0) {
      return badRequest("cardId must be a positive integer")
    }
  }
  if (!STATUSES.includes(status)) {
    return badRequest("status must be one of completed, pending, failed")
  }
  if (notes !== undefined && typeof notes !== "string") {
    return badRequest("notes must be a string")
  }

  const input: NewTransactionInput = {
    merchant: merchant.trim(),
    amount,
    type,
    category: category.trim(),
    date,
    accountId: resolvedAccountId,
    cardId: resolvedCardId,
    status,
    notes: typeof notes === "string" && notes.trim() ? notes.trim() : undefined,
  }

  try {
    const transaction = await createTransaction(input)
    return Response.json(transaction, { status: 201 })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 404 })
  }
}

const MAX_DELETE_IDS = 5000

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null)
  const ids = body?.ids

  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    return badRequest("ids must be an array of strings")
  }
  if (ids.length === 0) {
    return badRequest("ids must not be empty")
  }
  if (ids.length > MAX_DELETE_IDS) {
    return badRequest(`ids must not exceed ${MAX_DELETE_IDS} entries`)
  }

  const numericIds = ids.map((id) => Number(id)).filter((id) => Number.isInteger(id))
  const result = await deleteTransactions(numericIds)
  return Response.json(result)
}
