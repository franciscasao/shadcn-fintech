import { getTransactionsByIds } from "@/server/queries/transactions"

const MAX_EXPORT_IDS = 5000

function badRequest(error: string) {
  return Response.json({ error }, { status: 400 })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const ids = body?.ids

  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    return badRequest("ids must be an array of strings")
  }
  if (ids.length === 0) {
    return badRequest("ids must not be empty")
  }
  if (ids.length > MAX_EXPORT_IDS) {
    return badRequest(`ids must not exceed ${MAX_EXPORT_IDS} entries`)
  }

  const transactions = await getTransactionsByIds(ids)
  return Response.json(transactions)
}
