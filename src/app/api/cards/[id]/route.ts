import { setCardDailyLimit, setCardFrozen } from "@/server/mutations/cards"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const numericId = Number(id)
  if (!Number.isFinite(numericId)) {
    return Response.json({ error: "Invalid card id" }, { status: 400 })
  }

  const body = await request.json()
  try {
    if (typeof body?.frozen === "boolean") {
      const card = await setCardFrozen(numericId, body.frozen)
      return Response.json(card)
    }
    if (typeof body?.dailyLimit === "number" && Number.isFinite(body.dailyLimit)) {
      const card = await setCardDailyLimit(numericId, body.dailyLimit)
      return Response.json(card)
    }
    return Response.json(
      { error: "Provide either frozen (boolean) or dailyLimit (number)" },
      { status: 400 }
    )
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 404 })
  }
}
