import { markAllNotificationsRead } from "@/server/mutations/notifications"

export async function POST() {
  await markAllNotificationsRead()
  return new Response(null, { status: 204 })
}
