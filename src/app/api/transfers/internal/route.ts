import {
  createInternalTransfer,
  TransferNotFoundError,
  TransferValidationError,
  type NewInternalTransferInput,
} from "@/server/mutations/transfers"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function badRequest(error: string) {
  return Response.json({ error }, { status: 400 })
}

export async function POST(request: Request) {
  const body = await request.json()
  const { fromAccountId, toAccountId, amount, date, note } = body ?? {}

  const resolvedFromId = Number(fromAccountId)
  if (!Number.isInteger(resolvedFromId)) {
    return badRequest("fromAccountId is required")
  }
  const resolvedToId = Number(toAccountId)
  if (!Number.isInteger(resolvedToId)) {
    return badRequest("toAccountId is required")
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

  const input: NewInternalTransferInput = {
    fromAccountId: resolvedFromId,
    toAccountId: resolvedToId,
    amount,
    date,
    note: typeof note === "string" && note.trim() ? note.trim() : undefined,
  }

  try {
    const transfer = await createInternalTransfer(input)
    return Response.json(transfer, { status: 201 })
  } catch (err) {
    if (err instanceof TransferValidationError) {
      return badRequest(err.message)
    }
    if (err instanceof TransferNotFoundError) {
      return Response.json({ error: err.message }, { status: 404 })
    }
    throw err
  }
}
