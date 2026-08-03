import { eq } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { accounts } from "@/server/db/schema"
import type { BankAccount } from "@/lib/types"

// Same mapping as the original add-account.tsx client-side construction —
// moved server-side so account creation happens in one trusted place.
const TYPE_COLORS: Record<BankAccount["type"], string> = {
  checking: "bg-blue-500",
  savings: "bg-emerald-500",
  crypto: "bg-orange-500",
  investment: "bg-violet-500",
}

export type NewAccountInput = {
  institution: string
  type: BankAccount["type"]
  accountNumber: string
}

function toBankAccount(row: typeof accounts.$inferSelect): BankAccount {
  return {
    id: String(row.id),
    name: row.name,
    type: row.type,
    institution: row.institution,
    institutionLogo: row.institutionLogo,
    accountNumber: row.accountNumber,
    balance: row.balance,
    currency: row.currency,
    change: row.change,
    changePercent: row.changePercent,
    lastActivity: row.lastActivity,
    color: row.color,
  }
}

export async function createAccount(input: NewAccountInput): Promise<BankAccount> {
  const db = getDb()
  const typeLabel = input.type.charAt(0).toUpperCase() + input.type.slice(1)
  const [row] = db
    .insert(accounts)
    .values({
      userId: DEMO_USER_ID,
      name: `${input.institution} ${typeLabel}`,
      type: input.type,
      institution: input.institution,
      institutionLogo: `/logos/${input.institution.toLowerCase().replace(/\s+/g, "")}-com.png`,
      accountNumber: `****${input.accountNumber.slice(-4)}`,
      balance: 0,
      currency: "$",
      change: 0,
      changePercent: 0,
      lastActivity: "Just now",
      color: TYPE_COLORS[input.type] ?? "bg-gray-500",
    })
    .returning()
    .all()
  return toBankAccount(row)
}

/** Adjusts an account's stored balance by `delta` (positive = credit, negative = debit). */
export async function adjustAccountBalance(accountId: number, delta: number) {
  const db = getDb()
  const account = db.select().from(accounts).where(eq(accounts.id, accountId)).get()
  if (!account) throw new Error(`Account ${accountId} not found`)
  db.update(accounts)
    .set({ balance: Math.round((account.balance + delta) * 100) / 100 })
    .where(eq(accounts.id, accountId))
    .run()
}
