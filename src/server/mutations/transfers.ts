import { eq } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { accounts, contacts, transfers } from "@/server/db/schema"
import { getPrimaryAccountId } from "@/server/queries/accounts"
import { LEDGER_ANCHOR } from "@/server/db/generate"
import { displayDate, toISODate } from "@/server/db/format"
import type { TransferRecord } from "@/lib/types"

export type NewTransferInput = {
  contactId: number
  amount: number
  note?: string
}

export async function createTransfer(input: NewTransferInput): Promise<TransferRecord> {
  const db = getDb()
  const contact = db.select().from(contacts).where(eq(contacts.id, input.contactId)).get()
  if (!contact) throw new Error(`Contact ${input.contactId} not found`)

  const accountId = await getPrimaryAccountId()
  const date = toISODate(LEDGER_ANCHOR)

  // Insert the transfer and debit the sending account atomically.
  const row = db.transaction((tx) => {
    const [inserted] = tx
      .insert(transfers)
      .values({
        userId: DEMO_USER_ID,
        contactId: input.contactId,
        accountId,
        type: "sent",
        amount: input.amount,
        date,
        status: "completed",
        note: input.note,
      })
      .returning()
      .all()

    const account = tx.select().from(accounts).where(eq(accounts.id, accountId)).get()
    if (!account) throw new Error(`Account ${accountId} not found`)
    tx.update(accounts)
      .set({ balance: Math.round((account.balance - input.amount) * 100) / 100 })
      .where(eq(accounts.id, accountId))
      .run()

    return inserted
  })

  return {
    id: String(row.id),
    type: row.type,
    contactName: contact.name,
    contactAvatar: contact.avatar,
    amount: row.amount,
    date: displayDate(row.date),
    status: row.status,
    note: row.note ?? undefined,
  }
}

export async function deleteTransfer(id: number): Promise<void> {
  const db = getDb()
  db.delete(transfers).where(eq(transfers.id, id)).run()
}
