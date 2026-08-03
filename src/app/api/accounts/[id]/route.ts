import { getAccountById } from "@/server/queries/accounts"
import { setAccountBalance } from "@/server/mutations/accounts"

function badRequest(error: string) {
  return Response.json({ error }, { status: 400 })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const accountId = Number(id)
  if (!Number.isInteger(accountId)) return badRequest("invalid account id")

  const existing = await getAccountById(accountId)
  if (!existing) return Response.json({ error: "account not found" }, { status: 404 })

  const body = await request.json()
  const { balance } = body ?? {}
  if (typeof balance !== "number" || !Number.isFinite(balance) || balance < 0) {
    return badRequest("balance must be a non-negative number")
  }

  const account = await setAccountBalance(accountId, balance)
  return Response.json(account)
}
