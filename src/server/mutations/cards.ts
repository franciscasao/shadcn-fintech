import { eq } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { cards } from "@/server/db/schema"
import type { CardData } from "@/lib/types"

function randomDigits(n: number): string {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("")
}

function toCardData(row: typeof cards.$inferSelect): CardData {
  return {
    id: String(row.id),
    name: row.name,
    type: row.type,
    last4: row.last4,
    cardNumber: row.cardNumber,
    holder: row.holder,
    expiry: row.expiry,
    cvv: row.cvv,
    network: row.network,
    frozen: row.frozen,
    dailyLimit: row.dailyLimit,
    monthlySpend: row.monthlySpend,
    monthlyLimit: row.monthlyLimit,
    color: row.color,
  }
}

export type NewVirtualCardInput = {
  name: string
  monthlyLimit?: number
}

// Same generation logic as the original virtual-card-generator.tsx client-side
// construction — moved server-side so card numbers are minted in one place.
export async function createVirtualCard(input: NewVirtualCardInput): Promise<CardData> {
  const db = getDb()
  const last4 = randomDigits(4)
  const [row] = db
    .insert(cards)
    .values({
      userId: DEMO_USER_ID,
      name: input.name,
      type: "virtual",
      last4,
      cardNumber: `${randomDigits(4)} ${randomDigits(4)} ${randomDigits(4)} ${last4}`,
      holder: "ALEX MORGAN",
      expiry: `${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}/${String(
        new Date().getFullYear() + 3
      ).slice(-2)}`,
      cvv: randomDigits(3),
      network: Math.random() > 0.5 ? "visa" : "mastercard",
      frozen: false,
      dailyLimit: 1000,
      monthlySpend: 0,
      monthlyLimit: input.monthlyLimit && input.monthlyLimit > 0 ? input.monthlyLimit : 3000,
      color: "bg-muted text-foreground",
    })
    .returning()
    .all()
  return toCardData(row)
}

export async function setCardFrozen(id: number, frozen: boolean): Promise<CardData> {
  const db = getDb()
  const [row] = db.update(cards).set({ frozen }).where(eq(cards.id, id)).returning().all()
  if (!row) throw new Error(`Card ${id} not found`)
  return toCardData(row)
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
  return toCardData(row)
}
