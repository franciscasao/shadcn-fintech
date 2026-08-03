import { and, eq, gte, lt } from "drizzle-orm"
import { addDays, format, subDays, subMonths } from "date-fns"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { budgetCategories, transactions } from "@/server/db/schema"
import { BUDGET_BUCKETS, CATEGORY_TO_BUDGET_BUCKET, LEDGER_ANCHOR } from "@/server/db/generate"
import { toISODate } from "@/server/db/format"
import type {
  CategoryBreakdown,
  DailySpending,
  MonthComparison,
  RecurringCharge,
  SpendingHeatmapDay,
} from "@/lib/types"

// The 8 budget-bucket categories cycle through 5 chart colors, matching the
// original hand-written categoryBreakdowns data.
const BUCKET_COLOR: Record<string, string> = {
  "Food & Dining": "var(--color-chart-1)",
  Transport: "var(--color-chart-2)",
  Entertainment: "var(--color-chart-3)",
  Shopping: "var(--color-chart-4)",
  Subscriptions: "var(--color-chart-5)",
  Health: "var(--color-chart-1)",
  Travel: "var(--color-chart-2)",
  Education: "var(--color-chart-3)",
}

// A handful of the detected recurring merchants are flagged for
// review/unset rather than "wanted", matching the flavor of the original
// hand-written recurringCharges data.
const RECURRING_STATUS_OVERRIDE: Record<string, "review" | "unset"> = {
  "Adobe Creative Cloud": "review",
  Slack: "review",
  Notion: "unset",
}

type TxnRow = typeof transactions.$inferSelect

async function getAllTransactions(): Promise<TxnRow[]> {
  const db = getDb()
  return db.select().from(transactions).where(eq(transactions.userId, DEMO_USER_ID)).all()
}

function monthBounds(monthsAgo: number) {
  const anchorMonthStart = new Date(LEDGER_ANCHOR.getFullYear(), LEDGER_ANCHOR.getMonth(), 1)
  const start = subMonths(anchorMonthStart, monthsAgo)
  const end = subMonths(anchorMonthStart, monthsAgo - 1)
  return { start: toISODate(start), end: toISODate(end) }
}

// ── Category breakdown (analytics donut) — current month, expense only ─────
export async function getCategoryBreakdown(): Promise<CategoryBreakdown[]> {
  const rows = await getAllTransactions()
  const { start, end } = monthBounds(0)
  const monthExpenses = rows.filter(
    (r) => r.type === "expense" && r.date >= start && r.date < end
  )

  const buckets = new Map<string, { amount: number; subs: Map<string, number> }>()
  for (const r of monthExpenses) {
    const bucket = CATEGORY_TO_BUDGET_BUCKET[r.category] ?? r.category
    const sub = r.subcategory ?? "Other"
    if (!buckets.has(bucket)) buckets.set(bucket, { amount: 0, subs: new Map() })
    const entry = buckets.get(bucket)!
    const amt = Math.abs(r.amount)
    entry.amount += amt
    entry.subs.set(sub, (entry.subs.get(sub) ?? 0) + amt)
  }

  return BUDGET_BUCKETS.filter((b) => buckets.has(b)).map((category) => {
    const entry = buckets.get(category)!
    return {
      category,
      amount: Math.round(entry.amount * 100) / 100,
      color: BUCKET_COLOR[category] ?? "var(--color-chart-1)",
      subcategories: Array.from(entry.subs.entries())
        .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }))
        .sort((a, b) => b.amount - a.amount),
    }
  })
}

// ── Spending heatmap — 365 days ending at the anchor ────────────────────────
export async function getSpendingHeatmap(): Promise<SpendingHeatmapDay[]> {
  const rows = await getAllTransactions()
  const start = subDays(LEDGER_ANCHOR, 364)

  const byDate = new Map<string, number>()
  for (const r of rows) {
    if (r.type !== "expense") continue
    if (r.date < toISODate(start) || r.date > toISODate(LEDGER_ANCHOR)) continue
    byDate.set(r.date, (byDate.get(r.date) ?? 0) + Math.abs(r.amount))
  }

  const days: SpendingHeatmapDay[] = []
  for (let i = 0; i < 365; i++) {
    const d = addDays(start, i)
    const iso = toISODate(d)
    days.push({ date: iso, amount: Math.round((byDate.get(iso) ?? 0) * 100) / 100 })
  }
  return days
}

// ── Month comparison — this month vs last month, by budget bucket ──────────
export async function getMonthComparison(): Promise<MonthComparison[]> {
  const rows = await getAllTransactions()
  const thisMonth = monthBounds(0)
  const lastMonth = monthBounds(1)

  const sumByBucket = (start: string, end: string) => {
    const map = new Map<string, number>()
    for (const r of rows) {
      if (r.type !== "expense" || r.date < start || r.date >= end) continue
      const bucket = CATEGORY_TO_BUDGET_BUCKET[r.category] ?? r.category
      map.set(bucket, (map.get(bucket) ?? 0) + Math.abs(r.amount))
    }
    return map
  }

  const thisMonthByBucket = sumByBucket(thisMonth.start, thisMonth.end)
  const lastMonthByBucket = sumByBucket(lastMonth.start, lastMonth.end)

  return BUDGET_BUCKETS.map((category) => ({
    category,
    thisMonth: Math.round((thisMonthByBucket.get(category) ?? 0) * 100) / 100,
    lastMonth: Math.round((lastMonthByBucket.get(category) ?? 0) * 100) / 100,
  }))
}

// ── Money movement — 7d / 30d / 90d money in vs out ─────────────────────────
type MoneyMovementPoint = { label: string; moneyIn: number; moneyOut: number }

export async function getMoneyMovement(): Promise<{
  "7d": MoneyMovementPoint[]
  "30d": MoneyMovementPoint[]
  "90d": MoneyMovementPoint[]
}> {
  const rows = await getAllTransactions()

  const sumFor = (date: string) => {
    let moneyIn = 0
    let moneyOut = 0
    for (const r of rows) {
      if (r.date !== date) continue
      if (r.type === "income") moneyIn += r.amount
      else moneyOut += Math.abs(r.amount)
    }
    return { moneyIn, moneyOut }
  }

  const sevenDay: MoneyMovementPoint[] = []
  for (let i = 6; i >= 0; i--) {
    const d = subDays(LEDGER_ANCHOR, i)
    const { moneyIn, moneyOut } = sumFor(toISODate(d))
    sevenDay.push({ label: format(d, "EEE"), moneyIn: round(moneyIn), moneyOut: round(moneyOut) })
  }

  const thirtyDay: MoneyMovementPoint[] = []
  for (let week = 3; week >= 0; week--) {
    const weekEnd = subDays(LEDGER_ANCHOR, week * 7)
    const weekStart = subDays(weekEnd, 6)
    let moneyIn = 0
    let moneyOut = 0
    for (const r of rows) {
      if (r.date < toISODate(weekStart) || r.date > toISODate(weekEnd)) continue
      if (r.type === "income") moneyIn += r.amount
      else moneyOut += Math.abs(r.amount)
    }
    thirtyDay.push({
      label: `Week ${4 - week}`,
      moneyIn: round(moneyIn),
      moneyOut: round(moneyOut),
    })
  }

  const ninetyDay: MoneyMovementPoint[] = []
  for (let m = 2; m >= 0; m--) {
    const { start, end } = monthBounds(m)
    let moneyIn = 0
    let moneyOut = 0
    for (const r of rows) {
      if (r.date < start || r.date >= end) continue
      if (r.type === "income") moneyIn += r.amount
      else moneyOut += Math.abs(r.amount)
    }
    ninetyDay.push({
      label: format(new Date(start), "MMM"),
      moneyIn: round(moneyIn),
      moneyOut: round(moneyOut),
    })
  }

  return { "7d": sevenDay, "30d": thirtyDay, "90d": ninetyDay }
}

// ── Financial overview — monthly income, current 12-month window vs prior ──
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export async function getFinancialOverview(): Promise<
  { month: string; currentYear: number; lastYear: number }[]
> {
  const rows = await getAllTransactions()
  const income = rows.filter((r) => r.type === "income")

  const sumForMonthName = (monthName: string, monthsAgoStart: number) => {
    // Sum income across the 12-month window [monthsAgoStart+12, monthsAgoStart)
    // months back from the anchor, for the given calendar month name.
    let total = 0
    for (const r of income) {
      const d = new Date(r.date)
      if (MONTH_NAMES[d.getMonth()] !== monthName) continue
      const monthsBack =
        (LEDGER_ANCHOR.getFullYear() - d.getFullYear()) * 12 +
        (LEDGER_ANCHOR.getMonth() - d.getMonth())
      if (monthsBack >= monthsAgoStart && monthsBack < monthsAgoStart + 12) {
        total += r.amount
      }
    }
    return Math.round(total * 100) / 100
  }

  return MONTH_NAMES.map((month) => ({
    month,
    currentYear: sumForMonthName(month, 0),
    lastYear: sumForMonthName(month, 12),
  }))
}

// ── Recurring charge detection ──────────────────────────────────────────────
export async function getRecurringCharges(): Promise<RecurringCharge[]> {
  const rows = await getAllTransactions()
  const expenses = rows.filter((r) => r.type === "expense")

  const groups = new Map<string, TxnRow[]>()
  for (const r of expenses) {
    const key = `${r.merchant}::${r.amount}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r)
  }

  const charges: RecurringCharge[] = []
  for (const [, group] of groups) {
    if (group.length < 3) continue
    const latest = group.reduce((a, b) => (a.date > b.date ? a : b))
    const nextDate = addDays(new Date(latest.date), 30)
    charges.push({
      id: `rc-${latest.merchant}-${Math.abs(latest.amount)}`.toLowerCase().replace(/\s+/g, "-"),
      merchant: latest.merchant,
      logo: latest.logo,
      amount: Math.abs(latest.amount),
      frequency: "monthly",
      nextDate: format(nextDate, "MMM dd, yyyy"),
      status: RECURRING_STATUS_OVERRIDE[latest.merchant] ?? "wanted",
      category: latest.category,
    })
  }

  return charges.sort((a, b) => b.amount - a.amount)
}

// ── Monthly spending limit (dashboard widget) ───────────────────────────────
export async function getSpendingLimitSummary() {
  const db = getDb()
  const { start, end } = monthBounds(0)
  const rows = db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, DEMO_USER_ID),
        eq(transactions.type, "expense"),
        gte(transactions.date, start),
        lt(transactions.date, end)
      )
    )
    .all()
  const spent = round(rows.reduce((s, r) => s + Math.abs(r.amount), 0))

  // Total monthly budget = sum of every budget category's target.
  const budgetRows = db
    .select()
    .from(budgetCategories)
    .where(eq(budgetCategories.userId, DEMO_USER_ID))
    .all()
  const budget = round(budgetRows.reduce((s, b) => s + b.budget, 0))

  const monthStart = new Date(start)
  const monthEnd = addDays(new Date(end), -1)

  return {
    budget,
    spent,
    remaining: round(budget - spent),
    currency: "PHP",
    periodStart: format(monthStart, "MMM dd"),
    periodEnd: format(monthEnd, "MMM dd"),
  }
}

// ── Daily spending (budgets page calendar + month projection) ──────────────
export async function getDailySpending(): Promise<DailySpending[]> {
  const rows = await getAllTransactions()
  const { start } = monthBounds(0)
  const monthStart = new Date(start)
  const daysInMonth = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0
  ).getDate()

  const byDate = new Map<string, number>()
  for (const r of rows) {
    if (r.type !== "expense") continue
    byDate.set(r.date, (byDate.get(r.date) ?? 0) + Math.abs(r.amount))
  }

  const days: DailySpending[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), d)
    const iso = toISODate(date)
    days.push({ date: iso, amount: Math.round((byDate.get(iso) ?? 0) * 100) / 100 })
  }
  return days
}

function round(n: number) {
  return Math.round(n * 100) / 100
}
