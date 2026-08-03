import { getCards } from "@/server/queries/cards"
import { createVirtualCard } from "@/server/mutations/cards"

export async function GET() {
  const cards = await getCards()
  return Response.json(cards)
}

export async function POST(request: Request) {
  const body = await request.json()
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const monthlyLimit = Number(body?.monthlyLimit)

  if (!name) {
    return Response.json({ error: "name is required" }, { status: 400 })
  }

  const card = await createVirtualCard({
    name,
    monthlyLimit: Number.isFinite(monthlyLimit) ? monthlyLimit : undefined,
  })
  return Response.json(card, { status: 201 })
}
