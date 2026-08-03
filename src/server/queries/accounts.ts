import { eq } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { accounts } from "@/server/db/schema"
import type { BankAccount } from "@/lib/types"

/** Shared row -> API-shape mapper, also used by @/server/mutations/accounts. */
export function toBankAccount(row: typeof accounts.$inferSelect): BankAccount {
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
    templateId: row.templateId,
    institutionKind: row.institutionKind,
    pdicInsured: row.pdicInsured,
    interestRate: row.interestRate,
    creditingFrequency: row.creditingFrequency,
    creditingTiming: row.creditingTiming,
    compounding: row.compounding,
    maintainingBalance: row.maintainingBalance,
    requiredAdb: row.requiredAdb,
    interestCap: row.interestCap,
    monthlyFee: row.monthlyFee,
    freeTransfersPerMonth: row.freeTransfersPerMonth,
    instapayFee: row.instapayFee,
    pesonetFee: row.pesonetFee,
    dailyTransferLimit: row.dailyTransferLimit,
  }
}

export async function getAccounts(): Promise<BankAccount[]> {
  const db = getDb()
  const rows = db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, DEMO_USER_ID))
    .all()
  return rows.map(toBankAccount)
}

export async function getAccountById(id: number) {
  const db = getDb()
  return db.select().from(accounts).where(eq(accounts.id, id)).get()
}

/** The primary checking account — the default account for new activity. */
export async function getPrimaryAccountId(): Promise<number> {
  const db = getDb()
  const rows = db
    .select({ id: accounts.id, name: accounts.name })
    .from(accounts)
    .where(eq(accounts.userId, DEMO_USER_ID))
    .all()
  const primary = rows.find((a) => a.name === "Primary Checking") ?? rows[0]
  if (!primary) throw new Error("No accounts seeded for demo user")
  return primary.id
}
