import { and, desc, eq } from "drizzle-orm"
import { formatDistanceToNow, parseISO } from "date-fns"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { notifications } from "@/server/db/schema"
import type { Notification } from "@/lib/types"

// "time" is derived from createdAt at read time rather than read from
// row.time — a frozen "5 min ago" string never ages, and would keep saying
// exactly that no matter how long a notification has actually been sitting
// unread. row.time still exists as a NOT NULL column (see schema.ts) but is
// otherwise vestigial.
function toNotification(row: typeof notifications.$inferSelect): Notification {
  return {
    id: String(row.id),
    type: row.type,
    title: row.title,
    description: row.description,
    time: formatDistanceToNow(parseISO(row.createdAt), { addSuffix: true }),
    read: row.read,
    icon: row.icon,
    actionable: row.actionable ? JSON.parse(row.actionable) : undefined,
  }
}

export async function getNotifications(): Promise<Notification[]> {
  const db = getDb()
  const rows = db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, DEMO_USER_ID))
    .orderBy(desc(notifications.id))
    .all()
  return rows.map(toNotification)
}

export async function getUnreadNotificationCount(): Promise<number> {
  const db = getDb()
  const rows = db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, DEMO_USER_ID), eq(notifications.read, false)))
    .all()
  return rows.length
}
