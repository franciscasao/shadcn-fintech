import { and, eq } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { notifications } from "@/server/db/schema"

export async function setNotificationRead(id: number, read: boolean) {
  const db = getDb()
  db.update(notifications).set({ read }).where(eq(notifications.id, id)).run()
}

export async function deleteNotification(id: number) {
  const db = getDb()
  db.delete(notifications).where(eq(notifications.id, id)).run()
}

export async function markAllNotificationsRead() {
  const db = getDb()
  db.update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, DEMO_USER_ID), eq(notifications.read, false)))
    .run()
}
