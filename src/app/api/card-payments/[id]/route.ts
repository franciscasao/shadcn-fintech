import { deleteCardPayment } from "@/server/mutations/card-payments"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const numericId = Number(id)
  if (!Number.isFinite(numericId)) {
    return Response.json({ error: "Invalid card payment id" }, { status: 400 })
  }
  await deleteCardPayment(numericId)
  return new Response(null, { status: 204 })
}
