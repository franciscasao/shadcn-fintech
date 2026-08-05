import { eq } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { cards } from "@/server/db/schema"
import { toCardData } from "@/server/queries/cards"
import { getAccountById } from "@/server/queries/accounts"
import { getInstitution } from "@/lib/ph-institutions"
import { DEFAULT_LIMITS, type NewCardInput } from "@/lib/ph-cards"
import type { CardData } from "@/lib/types"

export type { NewCardInput }

function randomDigits(n: number): string {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("")
}

function pick<T>(value: T | undefined, fallback: T): T {
  return value !== undefined ? value : fallback
}

/** Standard mod-10 (Luhn) check digit for a partial card number. */
function luhnCheckDigit(partial: string): string {
  let sum = 0
  let double = true // rightmost digit of the check-digit-appended number is doubled first
  for (let i = partial.length - 1; i >= 0; i--) {
    let d = Number(partial[i])
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }
  return String((10 - (sum % 10)) % 10)
}

/** Generates a BIN-correct, Luhn-valid 16-digit card number for the given network. */
function generateCardNumber(network: "visa" | "mastercard"): string {
  const bin = network === "visa" ? "4" : String(51 + Math.floor(Math.random() * 5)) // 51-55
  const body = bin + randomDigits(15 - bin.length)
  const check = luhnCheckDigit(body)
  const digits = body + check
  return digits.match(/.{1,4}/g)!.join(" ")
}

function generateExpiry(type: "physical" | "virtual"): string {
  const yearsAhead = type === "physical" ? 5 : 3
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")
  const year = String(new Date().getFullYear() + yearsAhead).slice(-2)
  return `${month}/${year}`
}

export async function createCard(input: NewCardInput): Promise<CardData> {
  const db = getDb()
  const template = getInstitution(input.issuerTemplateId)

  let accountId: number | null = null
  let accountName: string | null = null
  if (input.accountId) {
    const parsed = Number(input.accountId)
    const account = await getAccountById(parsed)
    if (!account || account.userId !== DEMO_USER_ID) {
      throw new Error(`Account ${input.accountId} not found`)
    }
    accountId = account.id
    accountName = account.name
  }

  const limits = DEFAULT_LIMITS[input.product]
  const cardNumber = generateCardNumber(input.network)
  const last4 = cardNumber.slice(-4)

  const [row] = db
    .insert(cards)
    .values({
      userId: DEMO_USER_ID,
      name: input.name,
      type: input.type,
      last4,
      cardNumber,
      holder: input.holder.trim().toUpperCase(),
      expiry: generateExpiry(input.type),
      cvv: randomDigits(3),
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
    })
    .returning()
    .all()
  return toCardData(row, { monthlySpend: 0, accountName })
}

export async function setCardFrozen(id: number, frozen: boolean): Promise<CardData> {
  const db = getDb()
  const [row] = db.update(cards).set({ frozen }).where(eq(cards.id, id)).returning().all()
  if (!row) throw new Error(`Card ${id} not found`)
  const accountName = row.accountId ? (await getAccountById(row.accountId))?.name ?? null : null
  return toCardData(row, { monthlySpend: 0, accountName })
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
  return toCardData(row, { monthlySpend: 0, accountName })
}
