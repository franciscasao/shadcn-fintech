import { setCardDailyLimit, setCardFrozen, updateCardCreditTerms } from "@/server/mutations/cards"

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v)
}

function isDayOfMonth(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 31
}

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
    if (isFiniteNumber(body?.dailyLimit)) {
      const card = await setCardDailyLimit(numericId, body.dailyLimit)
      return Response.json(card)
    }
    const { creditLimit, apr, statementDay, dueDay } = body ?? {}
    if (
      creditLimit !== undefined ||
      apr !== undefined ||
      statementDay !== undefined ||
      dueDay !== undefined
    ) {
      if (creditLimit !== undefined && (!isFiniteNumber(creditLimit) || creditLimit < 0)) {
        return Response.json({ error: "creditLimit must be a non-negative number" }, { status: 400 })
      }
      if (apr !== undefined && (!isFiniteNumber(apr) || apr < 0 || apr > 100)) {
        return Response.json({ error: "apr must be a number between 0 and 100" }, { status: 400 })
      }
      if (statementDay !== undefined && !isDayOfMonth(statementDay)) {
        return Response.json(
          { error: "statementDay must be an integer between 1 and 31" },
          { status: 400 }
        )
      }
      if (dueDay !== undefined && !isDayOfMonth(dueDay)) {
        return Response.json({ error: "dueDay must be an integer between 1 and 31" }, { status: 400 })
      }
      const card = await updateCardCreditTerms(numericId, { creditLimit, apr, statementDay, dueDay })
      return Response.json(card)
    }
    return Response.json(
      { error: "Provide frozen, dailyLimit, or credit terms (creditLimit/apr/statementDay/dueDay)" },
      { status: 400 }
    )
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 404 })
  }
}
