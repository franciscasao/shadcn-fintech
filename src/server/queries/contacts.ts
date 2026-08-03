import { eq } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { contacts } from "@/server/db/schema"
import type { Contact } from "@/lib/types"

export async function getContacts(): Promise<Contact[]> {
  const db = getDb()
  const rows = db
    .select()
    .from(contacts)
    .where(eq(contacts.userId, DEMO_USER_ID))
    .all()
  return rows.map((c) => ({ id: String(c.id), name: c.name, avatar: c.avatar }))
}
