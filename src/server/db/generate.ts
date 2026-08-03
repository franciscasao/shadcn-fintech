import { addDays, addMonths, format, getDaysInMonth, startOfMonth } from "date-fns"

import { logo } from "@/lib/media"

// ---------------------------------------------------------------------------
// Synthesizes a realistic transaction ledger to back the SQL-derived
// analytics (category breakdown, spending heatmap, month comparison, money
// movement, financial overview, recurring-charge detection). The 25
// hand-written transactions in the original src/data/seed.ts don't have
// enough history or repetition for any of that — see the "generated ledger"
// section of the implementation plan for why this exists and what it
// changes about the numbers shown in the app.
//
// The 12 recurring monthly subscriptions here are the exact same
// merchant/amount/category combinations as the curated 25 transactions
// inserted by src/server/db/seed.ts, so the recurring-charge detector finds
// a consistent 12-13 month history for every one of them.
// ---------------------------------------------------------------------------

const GENERIC_LOGO = "/icon.svg"

export type GeneratedTransaction = {
  merchant: string
  transactionId: string
  amount: number
  date: string // ISO yyyy-MM-dd
  logo: string
  category: string
  subcategory?: string
  status: "completed" | "pending" | "failed"
  type: "expense" | "income"
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1))
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)]
}

function money(n: number) {
  return Math.round(n * 100) / 100
}

function txnId(prefix: "INV" | "TXN") {
  return `${prefix}_${randInt(100000, 999999)}`
}

// The same 12 subscriptions as the curated fullTransactions/recurringCharges
// seed data, so generated history and curated recent rows line up.
const RECURRING: {
  merchant: string
  amount: number
  category: string
  subcategory: string
  logo: string
  day: number
}[] = [
  { merchant: "Spotify", amount: -9.99, category: "Entertainment", subcategory: "Streaming", logo: logo("spotify.com"), day: 10 },
  { merchant: "Netflix", amount: -15.99, category: "Entertainment", subcategory: "Streaming", logo: logo("netflix.com"), day: 2 },
  { merchant: "ChatGPT Plus", amount: -20.0, category: "AI Tools", subcategory: "SaaS Tools", logo: logo("openai.com"), day: 6 },
  { merchant: "Figma Pro", amount: -15.0, category: "Design", subcategory: "SaaS Tools", logo: logo("figma.com"), day: 7 },
  { merchant: "Adobe Creative Cloud", amount: -54.99, category: "Design", subcategory: "SaaS Tools", logo: logo("adobe.com"), day: 29 },
  { merchant: "AWS Cloud Services", amount: -120.0, category: "Technology", subcategory: "Cloud", logo: "/logos/aws-amazon-com.svg", day: 9 },
  { merchant: "Google Workspace", amount: -12.0, category: "Productivity", subcategory: "SaaS Tools", logo: logo("google.com"), day: 5 },
  { merchant: "Slack", amount: -8.75, category: "Productivity", subcategory: "SaaS Tools", logo: logo("slack.com"), day: 28 },
  { merchant: "GitHub Pro", amount: -4.0, category: "Technology", subcategory: "SaaS Tools", logo: logo("github.com"), day: 27 },
  { merchant: "Notion", amount: -10.0, category: "Productivity", subcategory: "SaaS Tools", logo: logo("notion.so"), day: 26 },
  { merchant: "LinkedIn Premium", amount: -29.99, category: "Productivity", subcategory: "SaaS Tools", logo: logo("linkedin.com"), day: 24 },
  { merchant: "Apple iCloud+", amount: -2.99, category: "Technology", subcategory: "Cloud", logo: logo("apple.com"), day: 23 },
]

type DiscretionaryMerchant = {
  merchant: string
  logoPath: string
  subcategory: string
  min: number
  max: number
  perMonth: [number, number]
}

// Budget-bucket category -> pool of merchants. These 8 buckets match
// budget_categories and the analytics category breakdown.
const DISCRETIONARY: Record<string, DiscretionaryMerchant[]> = {
  "Food & Dining": [
    { merchant: "DoorDash", logoPath: logo("doordash.com"), subcategory: "Restaurants", min: 18, max: 55, perMonth: [4, 8] },
    { merchant: "Amazon Fresh", logoPath: logo("amazon.com"), subcategory: "Groceries", min: 40, max: 140, perMonth: [3, 5] },
    { merchant: "Starbucks", logoPath: logo("starbucks.com"), subcategory: "Coffee", min: 4, max: 9, perMonth: [6, 12] },
  ],
  Transport: [
    { merchant: "Uber", logoPath: logo("uber.com"), subcategory: "Uber/Lyft", min: 9, max: 40, perMonth: [3, 6] },
    { merchant: "Shell Gas", logoPath: logo("shell.com"), subcategory: "Gas", min: 35, max: 65, perMonth: [2, 4] },
    { merchant: "City Transit", logoPath: GENERIC_LOGO, subcategory: "Public Transit", min: 5, max: 30, perMonth: [1, 3] },
  ],
  Entertainment: [
    { merchant: "Target", logoPath: logo("target.com"), subcategory: "Games", min: 15, max: 70, perMonth: [0, 2] },
    { merchant: "Live Nation Events", logoPath: GENERIC_LOGO, subcategory: "Events", min: 25, max: 140, perMonth: [0, 2] },
  ],
  Shopping: [
    { merchant: "Target", logoPath: logo("target.com"), subcategory: "Clothing", min: 25, max: 120, perMonth: [1, 3] },
    { merchant: "Apple Store", logoPath: logo("apple.com"), subcategory: "Electronics", min: 30, max: 400, perMonth: [0, 1] },
    { merchant: "Amazon", logoPath: logo("amazon.com"), subcategory: "Home", min: 20, max: 150, perMonth: [1, 3] },
  ],
  Health: [
    { merchant: "FitZone Gym", logoPath: GENERIC_LOGO, subcategory: "Gym", min: 30, max: 60, perMonth: [1, 1] },
    { merchant: "City Pharmacy", logoPath: GENERIC_LOGO, subcategory: "Pharmacy", min: 10, max: 60, perMonth: [0, 2] },
    { merchant: "VitaSupply", logoPath: GENERIC_LOGO, subcategory: "Supplements", min: 15, max: 50, perMonth: [0, 1] },
  ],
  Travel: [
    { merchant: "Delta Airlines", logoPath: logo("delta.com"), subcategory: "Flights", min: 150, max: 500, perMonth: [0, 1] },
    { merchant: "Airbnb Booking", logoPath: logo("airbnb.com"), subcategory: "Hotels", min: 100, max: 350, perMonth: [0, 1] },
  ],
  Education: [
    { merchant: "Online Academy", logoPath: GENERIC_LOGO, subcategory: "Courses", min: 15, max: 90, perMonth: [0, 2] },
    { merchant: "Amazon Books", logoPath: logo("amazon.com"), subcategory: "Books", min: 10, max: 40, perMonth: [0, 2] },
  ],
}

const INCOME_SOURCES = [
  { merchant: "Stripe Payout", logoPath: logo("stripe.com"), min: 2000, max: 9000 },
  { merchant: "Client Payment", logoPath: logo("paypal.com"), min: 500, max: 8500 },
  { merchant: "Freelance Project", logoPath: logo("wise.com"), min: 800, max: 4000 },
]

// Maps a fine-grained transaction category to one of the 8 budget-bucket
// categories used by budget_categories and the analytics breakdown.
// "Income" has no bucket — it's excluded from spending aggregates.
export const CATEGORY_TO_BUDGET_BUCKET: Record<string, string> = {
  "Food & Dining": "Food & Dining",
  Transport: "Transport",
  Entertainment: "Entertainment",
  Shopping: "Shopping",
  Health: "Health",
  Travel: "Travel",
  Education: "Education",
  Technology: "Subscriptions",
  Design: "Subscriptions",
  "AI Tools": "Subscriptions",
  Productivity: "Subscriptions",
}

export const BUDGET_BUCKETS = [
  "Food & Dining",
  "Transport",
  "Entertainment",
  "Shopping",
  "Subscriptions",
  "Health",
  "Travel",
  "Education",
] as const

/**
 * The anchor "today" for the whole app's fictional data — Apr 12, 2026,
 * the date of the most recent curated transaction (see seed.ts).
 */
export const LEDGER_ANCHOR = new Date(2026, 3, 12)

export function generateLedger(): GeneratedTransaction[] {
  const txns: GeneratedTransaction[] = []

  // Recurring + discretionary spend: a full year of history ending at the
  // anchor date. This overlaps the curated 25 hand-written transactions
  // (Mar 17 - Apr 10, 2026) — intentionally, since real ledgers have many
  // transactions on any given day. Without the overlap, the most recent
  // month would only contain the curated rows, which is too sparse for
  // monthly aggregates (category breakdown, budget "spent", card
  // monthlySpend) to look realistic.
  const historyEnd = LEDGER_ANCHOR
  const historyStart = addDays(LEDGER_ANCHOR, -365)

  let cursor = startOfMonth(historyStart)
  while (cursor <= historyEnd) {
    const daysInMonth = getDaysInMonth(cursor)

    for (const r of RECURRING) {
      const day = Math.min(r.day, daysInMonth)
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), day)
      if (date < historyStart || date > historyEnd) continue
      txns.push({
        merchant: r.merchant,
        amount: r.amount,
        category: r.category,
        subcategory: r.subcategory,
        logo: r.logo,
        date: format(date, "yyyy-MM-dd"),
        status: "completed",
        type: "expense",
        transactionId: txnId("INV"),
      })
    }

    for (const [category, merchants] of Object.entries(DISCRETIONARY)) {
      for (const m of merchants) {
        const count = randInt(m.perMonth[0], m.perMonth[1])
        for (let i = 0; i < count; i++) {
          const day = randInt(1, daysInMonth)
          const date = new Date(cursor.getFullYear(), cursor.getMonth(), day)
          if (date < historyStart || date > historyEnd) continue
          const roll = Math.random()
          txns.push({
            merchant: m.merchant,
            amount: -money(rand(m.min, m.max)),
            category,
            subcategory: m.subcategory,
            logo: m.logoPath,
            date: format(date, "yyyy-MM-dd"),
            status: roll < 0.03 ? "failed" : roll < 0.08 ? "pending" : "completed",
            type: "expense",
            transactionId: txnId("INV"),
          })
        }
      }
    }

    cursor = addMonths(cursor, 1)
  }

  // Income: an extra 12 months further back so the financial-overview chart
  // has a genuine year-over-year comparison instead of a synthetic multiplier.
  const incomeStart = addMonths(historyStart, -12)
  let incomeCursor = startOfMonth(incomeStart)
  while (incomeCursor <= historyEnd) {
    const daysInMonth = getDaysInMonth(incomeCursor)
    const count = randInt(1, 3)
    for (let i = 0; i < count; i++) {
      const day = randInt(1, daysInMonth)
      const date = new Date(incomeCursor.getFullYear(), incomeCursor.getMonth(), day)
      const src = pick(INCOME_SOURCES)
      txns.push({
        merchant: src.merchant,
        amount: money(rand(src.min, src.max)),
        category: "Income",
        logo: src.logoPath,
        date: format(date, "yyyy-MM-dd"),
        status: "completed",
        type: "income",
        transactionId: txnId("TXN"),
      })
    }
    incomeCursor = addMonths(incomeCursor, 1)
  }

  return txns
}
