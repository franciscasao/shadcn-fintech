import { eq, sql } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { accounts, cards, transactions, transfers } from "@/server/db/schema"
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

export type AccountImpact = { transactions: number; transfers: number; cards: number }

/** Counts of what deleting each account would take with it — powers the
 * delete-account confirmation dialog (see deleteAccount() in
 * @/server/mutations/accounts). Grouped counts merged into one map so the
 * accounts page can fetch this once instead of per-account. */
export async function getAccountImpacts(): Promise<Record<string, AccountImpact>> {
  const db = getDb()

  const txCounts = db
    .select({ accountId: transactions.accountId, count: sql<number>`count(*)` })
    .from(transactions)
    .where(eq(transactions.userId, DEMO_USER_ID))
    .groupBy(transactions.accountId)
    .all()

  const transferCounts = db
    .select({ accountId: transfers.accountId, count: sql<number>`count(*)` })
    .from(transfers)
    .where(eq(transfers.userId, DEMO_USER_ID))
    .groupBy(transfers.accountId)
    .all()
  const toAccountTransferCounts = db
    .select({ accountId: transfers.toAccountId, count: sql<number>`count(*)` })
    .from(transfers)
    .where(eq(transfers.userId, DEMO_USER_ID))
    .groupBy(transfers.toAccountId)
    .all()

  const cardCounts = db
    .select({ accountId: cards.accountId, count: sql<number>`count(*)` })
    .from(cards)
    .where(eq(cards.userId, DEMO_USER_ID))
    .groupBy(cards.accountId)
    .all()

  const impacts: Record<string, AccountImpact> = {}
  function ensure(id: number) {
    const key = String(id)
    return (impacts[key] ??= { transactions: 0, transfers: 0, cards: 0 })
  }

  for (const row of txCounts) {
    if (row.accountId == null) continue
    ensure(row.accountId).transactions += row.count
  }
  for (const row of transferCounts) {
    if (row.accountId == null) continue
    ensure(row.accountId).transfers += row.count
  }
  for (const row of toAccountTransferCounts) {
    if (row.accountId == null) continue
    ensure(row.accountId).transfers += row.count
  }
  for (const row of cardCounts) {
    if (row.accountId == null) continue
    ensure(row.accountId).cards += row.count
  }

  return impacts
}
