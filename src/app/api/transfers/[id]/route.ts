import { deleteTransfer } from "@/server/mutations/transfers"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const numericId = Number(id)
  if (!Number.isFinite(numericId)) {
    return Response.json({ error: "Invalid transfer id" }, { status: 400 })
  }
  await deleteTransfer(numericId)
  return new Response(null, { status: 204 })
}
