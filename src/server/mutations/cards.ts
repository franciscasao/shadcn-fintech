import { eq } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { cards } from "@/server/db/schema"
import { getCreditSummaryForCard, toCardData } from "@/server/queries/cards"
import { getAccountById } from "@/server/queries/accounts"
import { getInstitution } from "@/lib/ph-institutions"
import { DEFAULT_CREDIT_TERMS, DEFAULT_LIMITS, type NewCardInput } from "@/lib/ph-cards"
import type { CardData } from "@/lib/types"

export type { NewCardInput }

function pick<T>(value: T | undefined, fallback: T): T {
  return value !== undefined ? value : fallback
}

export async function createCard(input: NewCardInput): Promise<CardData> {
  const db = getDb()
  const template = getInstitution(input.issuerTemplateId)
  const isCredit = input.product === "credit"

  // A credit card draws on a credit line, not a funding account — ignore
  // any accountId passed for one (the issuer picker lets you pick "credit"
  // as the product for an account-based issuer selection, which would
  // otherwise wire the card to that account) so credit spend can never be
  // double-counted against it the way a NewTransactionInput with both
  // accountId and a credit cardId would be — see createTransaction in
  // @/server/mutations/transactions.
  let accountId: number | null = null
  let accountName: string | null = null
  if (input.accountId && !isCredit) {
    const parsed = Number(input.accountId)
    const account = await getAccountById(parsed)
    if (!account || account.userId !== DEMO_USER_ID) {
      throw new Error(`Account ${input.accountId} not found`)
    }
    accountId = account.id
    accountName = account.name
  }

  const limits = DEFAULT_LIMITS[input.product]

  const [row] = db
    .insert(cards)
    .values({
      userId: DEMO_USER_ID,
      name: input.name,
      type: input.type,
      last4: input.last4,
      holder: input.holder.trim().toUpperCase(),
      expiry: input.expiry,
      network: input.network,
      frozen: false,
      dailyLimit: input.dailyLimit && input.dailyLimit > 0 ? input.dailyLimit : limits.daily,
      monthlySpend: 0,
      monthlyLimit: input.monthlyLimit && input.monthlyLimit > 0 ? input.monthlyLimit : limits.monthly,
      color: input.color ?? template?.color ?? "bg-muted text-foreground",
      accountId,
      issuer: pick(input.issuer?.trim() || undefined, template?.name ?? ""),
      issuerLogo: template?.logo ?? "",
      issuerTemplateId: input.issuerTemplateId,
      product: input.product,
      // Credit terms only apply to product === "credit" — left null otherwise.
      creditLimit: isCredit ? pick(input.creditLimit, DEFAULT_CREDIT_TERMS.creditLimit) : null,
      apr: isCredit ? pick(input.apr, DEFAULT_CREDIT_TERMS.apr) : null,
      statementDay: isCredit ? pick(input.statementDay, DEFAULT_CREDIT_TERMS.statementDay) : null,
      dueDay: isCredit ? pick(input.dueDay, DEFAULT_CREDIT_TERMS.dueDay) : null,
    })
    .returning()
    .all()
  const credit = await getCreditSummaryForCard(row)
  return toCardData(row, { monthlySpend: 0, accountName, credit })
}

export async function setCardFrozen(id: number, frozen: boolean): Promise<CardData> {
  const db = getDb()
  const [row] = db.update(cards).set({ frozen }).where(eq(cards.id, id)).returning().all()
  if (!row) throw new Error(`Card ${id} not found`)
  const accountName = row.accountId ? (await getAccountById(row.accountId))?.name ?? null : null
  const credit = await getCreditSummaryForCard(row)
  return toCardData(row, { monthlySpend: 0, accountName, credit })
}

export async function setCardDailyLimit(id: number, dailyLimit: number): Promise<CardData> {
  const db = getDb()
  const [row] = db
    .update(cards)
    .set({ dailyLimit })
    .where(eq(cards.id, id))
    .returning()
    .all()
  if (!row) throw new Error(`Card ${id} not found`)
  const accountName = row.accountId ? (await getAccountById(row.accountId))?.name ?? null : null
  const credit = await getCreditSummaryForCard(row)
  return toCardData(row, { monthlySpend: 0, accountName, credit })
}

/** Updates a credit card's terms (credit limit, APR, statement/due day).
 * No-op fields are left untouched via `pick`. Rejects non-credit cards —
 * these fields are meaningless (and stay null) on debit/prepaid cards. */
export async function updateCardCreditTerms(
  id: number,
  input: { creditLimit?: number; apr?: number; statementDay?: number; dueDay?: number }
): Promise<CardData> {
  const db = getDb()
  const existing = db.select().from(cards).where(eq(cards.id, id)).get()
  if (!existing) throw new Error(`Card ${id} not found`)
  if (existing.product !== "credit") {
    throw new Error(`${existing.name} isn't a credit card`)
  }

  const [row] = db
    .update(cards)
    .set({
      creditLimit: pick(input.creditLimit, existing.creditLimit ?? DEFAULT_CREDIT_TERMS.creditLimit),
      apr: pick(input.apr, existing.apr ?? DEFAULT_CREDIT_TERMS.apr),
      statementDay: pick(input.statementDay, existing.statementDay ?? DEFAULT_CREDIT_TERMS.statementDay),
      dueDay: pick(input.dueDay, existing.dueDay ?? DEFAULT_CREDIT_TERMS.dueDay),
    })
    .where(eq(cards.id, id))
    .returning()
    .all()
  const accountName = row.accountId ? (await getAccountById(row.accountId))?.name ?? null : null
  const credit = await getCreditSummaryForCard(row)
  return toCardData(row, { monthlySpend: 0, accountName, credit })
}
