import { desc, eq } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { contacts, transfers } from "@/server/db/schema"
import { displayDate } from "@/server/db/format"
import type { TransferRecord } from "@/lib/types"

export async function getTransfers(): Promise<TransferRecord[]> {
  const db = getDb()
  const rows = db
    .select()
    .from(transfers)
    .innerJoin(contacts, eq(transfers.contactId, contacts.id))
    .where(eq(transfers.userId, DEMO_USER_ID))
    .orderBy(desc(transfers.date), desc(transfers.id))
    .all()

  return rows.map((row) => ({
    id: String(row.transfers.id),
    type: row.transfers.type,
    contactName: row.contacts.name,
    contactAvatar: row.contacts.avatar,
    amount: row.transfers.amount,
    date: displayDate(row.transfers.date),
    status: row.transfers.status,
    note: row.transfers.note ?? undefined,
  }))
}
