import { desc, eq } from "drizzle-orm"
import { alias } from "drizzle-orm/sqlite-core"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { accounts, contacts, transfers } from "@/server/db/schema"
import { displayDate } from "@/server/db/format"
import type { TransferRecord } from "@/lib/types"

const fromAccount = alias(accounts, "from_account")
const toAccount = alias(accounts, "to_account")

export async function getTransfers(): Promise<TransferRecord[]> {
  const db = getDb()
  // leftJoin, not innerJoin: internal transfers have no contact, and
  // external transfers have no toAccount — either join can be null.
  const rows = db
    .select()
    .from(transfers)
    .leftJoin(contacts, eq(transfers.contactId, contacts.id))
    .leftJoin(fromAccount, eq(transfers.accountId, fromAccount.id))
    .leftJoin(toAccount, eq(transfers.toAccountId, toAccount.id))
    .where(eq(transfers.userId, DEMO_USER_ID))
    .orderBy(desc(transfers.date), desc(transfers.id))
    .all()

  return rows.map((row) => ({
    id: String(row.transfers.id),
    kind: row.transfers.kind,
    type: row.transfers.type,
    contactName: row.contacts?.name,
    contactAvatar: row.contacts?.avatar,
    fromAccountName: row.from_account?.name,
    toAccountName: row.to_account?.name,
    amount: row.transfers.amount,
    date: displayDate(row.transfers.date),
    status: row.transfers.status,
    note: row.transfers.note ?? undefined,
  }))
}
