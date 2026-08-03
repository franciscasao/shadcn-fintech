import { getTransfers } from "@/server/queries/transfers"
import { createTransfer } from "@/server/mutations/transfers"

export async function GET() {
  const transfers = await getTransfers()
  return Response.json(transfers)
}

export async function POST(request: Request) {
  const body = await request.json()
  const contactId = Number(body?.contactId)
  const amount = Number(body?.amount)
  const note = typeof body?.note === "string" && body.note.trim() ? body.note.trim() : undefined

  if (!Number.isFinite(contactId) || !Number.isFinite(amount) || amount <= 0) {
    return Response.json(
      { error: "contactId and a positive amount are required" },
      { status: 400 }
    )
  }

  try {
    const transfer = await createTransfer({ contactId, amount, note })
    return Response.json(transfer, { status: 201 })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 404 })
  }
}
