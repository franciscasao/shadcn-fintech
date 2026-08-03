import { eq } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { accounts } from "@/server/db/schema"
import { toBankAccount } from "@/server/queries/accounts"
import { getInstitution, type NewAccountInput } from "@/lib/ph-institutions"
import type { BankAccount } from "@/lib/types"

export type { NewAccountInput }

// Fallback border color when no institution template applies (the "custom
// institution" path) — same values the client picker used to hardcode.
const TYPE_COLORS: Record<BankAccount["type"], string> = {
  checking: "bg-blue-500",
  savings: "bg-emerald-500",
  crypto: "bg-orange-500",
  investment: "bg-violet-500",
}

function pick<T>(value: T | undefined, fallback: T): T {
  return value !== undefined ? value : fallback
}

export async function createAccount(input: NewAccountInput): Promise<BankAccount> {
  const db = getDb()
  const template = getInstitution(input.templateId)
  const typeLabel = input.type.charAt(0).toUpperCase() + input.type.slice(1)

  const [row] = db
    .insert(accounts)
    .values({
      userId: DEMO_USER_ID,
      name: input.nickname?.trim() || `${input.institution} ${typeLabel}`,
      type: input.type,
      institution: input.institution,
      institutionLogo: template?.logo ?? "",
      accountNumber: `****${input.accountNumber.slice(-4)}`,
      balance: input.balance ?? 0,
      currency: "₱",
      change: 0,
      changePercent: 0,
      lastActivity: "Just now",
      color: template?.color ?? TYPE_COLORS[input.type] ?? "bg-gray-500",

      templateId: input.templateId,
      institutionKind: template?.kind ?? null,
      pdicInsured: pick(input.pdicInsured, template?.pdicInsured ?? false),

      interestRate: pick(input.interestRate, template?.interestRate ?? null),
      creditingFrequency: pick(input.creditingFrequency, template?.creditingFrequency ?? "none"),
      creditingTiming: pick(input.creditingTiming, template?.creditingTiming ?? null),
      compounding: pick(input.compounding, template?.compounding ?? false),

      maintainingBalance: pick(input.maintainingBalance, template?.maintainingBalance ?? null),
      requiredAdb: pick(input.requiredAdb, template?.requiredAdb ?? null),
      interestCap: pick(input.interestCap, template?.interestCap ?? null),

      monthlyFee: pick(input.monthlyFee, template?.monthlyFee ?? null),
      freeTransfersPerMonth: pick(
        input.freeTransfersPerMonth,
        template?.freeTransfersPerMonth ?? null
      ),
      instapayFee: pick(input.instapayFee, template?.instapayFee ?? null),
      pesonetFee: pick(input.pesonetFee, template?.pesonetFee ?? null),
      dailyTransferLimit: pick(input.dailyTransferLimit, template?.dailyTransferLimit ?? null),
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
