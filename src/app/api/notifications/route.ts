import { getNotifications } from "@/server/queries/notifications"

export async function GET() {
  const notifications = await getNotifications()
  return Response.json(notifications)
}
