import { getNotifications } from "@/server/queries/notifications"
import { NotificationsPageClient } from "@/components/notifications/notifications-page-client"

// Reads live data from SQLite on every request — see (dashboard)/layout.tsx.
export const dynamic = "force-dynamic"

export default async function Page() {
  const notifications = await getNotifications()
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <NotificationsPageClient initialNotifications={notifications} />
    </div>
  )
}
