import { getCardPayments } from "@/server/queries/card-payments"
import {
  createCardPayment,
  CardPaymentNotFoundError,
  CardPaymentValidationError,
  type NewCardPaymentInput,
} from "@/server/mutations/card-payments"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function badRequest(error: string) {
  return Response.json({ error }, { status: 400 })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cardParam = searchParams.get("card")
  let cardId: number | undefined
  if (cardParam) {
    cardId = Number(cardParam)
    if (!Number.isInteger(cardId)) return badRequest("card must be an integer id")
  }
  const payments = await getCardPayments(cardId)
  return Response.json(payments)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { cardId, fromAccountId, amount, date, note } = body ?? {}

  const resolvedCardId = Number(cardId)
  if (!Number.isInteger(resolvedCardId)) {
    return badRequest("cardId is required")
  }
  const resolvedFromAccountId = Number(fromAccountId)
  if (!Number.isInteger(resolvedFromAccountId)) {
    return badRequest("fromAccountId is required")
  }
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return badRequest("amount must be a positive number")
  }
  if (typeof date !== "string" || !ISO_DATE.test(date)) {
    return badRequest("date must be an ISO yyyy-MM-dd string")
  }
  if (note !== undefined && typeof note !== "string") {
    return badRequest("note must be a string")
  }

  const input: NewCardPaymentInput = {
    cardId: resolvedCardId,
    fromAccountId: resolvedFromAccountId,
    amount,
    date,
    note: typeof note === "string" && note.trim() ? note.trim() : undefined,
  }

  try {
    const payment = await createCardPayment(input)
    return Response.json(payment, { status: 201 })
  } catch (err) {
    if (err instanceof CardPaymentValidationError) {
      return badRequest(err.message)
    }
    if (err instanceof CardPaymentNotFoundError) {
      return Response.json({ error: err.message }, { status: 404 })
    }
    throw err
  }
}
