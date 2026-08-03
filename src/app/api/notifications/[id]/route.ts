import { deleteNotification, setNotificationRead } from "@/server/mutations/notifications"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const numericId = Number(id)
  const body = await request.json()
  if (!Number.isFinite(numericId) || typeof body?.read !== "boolean") {
    return Response.json({ error: "read (boolean) is required" }, { status: 400 })
  }
  await setNotificationRead(numericId, body.read)
  return new Response(null, { status: 204 })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const numericId = Number(id)
  if (!Number.isFinite(numericId)) {
    return Response.json({ error: "Invalid notification id" }, { status: 400 })
  }
  await deleteNotification(numericId)
  return new Response(null, { status: 204 })
}
