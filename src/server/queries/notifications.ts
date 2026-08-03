import { and, desc, eq } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { notifications } from "@/server/db/schema"
import type { Notification } from "@/lib/types"

function toNotification(row: typeof notifications.$inferSelect): Notification {
  return {
    id: String(row.id),
    type: row.type,
    title: row.title,
    description: row.description,
    time: row.time,
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
