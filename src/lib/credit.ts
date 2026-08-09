// ---------------------------------------------------------------------------
// Statement-cycle math for credit cards (product: "credit" — see @/lib/types
// CardData / CreditSummary). Plain data/math, no JSX and no @/server
// imports — same pattern as @/lib/ph-cards and @/lib/interest — so the
// client card components, the API route validator, the mutation layer, and
// the DB seed can all import it without pulling in better-sqlite3.
//
// Everything here takes `today` as an explicit argument rather than reading
// Date.now() directly, so callers can pass a single shared "now" (see
// @/lib/today) instead of every function computing it independently.
// ---------------------------------------------------------------------------

export const MIN_PAYMENT_RULE = { percent: 0.05, floor: 500 }

export type PaymentStatus = "paid" | "current" | "due_soon" | "overdue"

/** Clamps a 1-31 "day of month" field to however many days the given month
 * actually has (e.g. dueDay: 31 in February resolves to the 28th/29th). */
function clampToMonth(year: number, month: number, day: number): Date {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(day, daysInMonth))
}

/** The most recent statement close on or before `today`. */
export function lastStatementClose(statementDay: number, today: Date): Date {
  const thisMonth = clampToMonth(today.getFullYear(), today.getMonth(), statementDay)
  if (thisMonth <= today) return thisMonth
  return clampToMonth(today.getFullYear(), today.getMonth() - 1, statementDay)
}

/** The next payment due date at or after `today`, derived from the most
 * recent statement close plus the due-day offset. */
export function nextDueDate(statementDay: number, dueDay: number, today: Date): Date {
  const close = lastStatementClose(statementDay, today)
  let due = clampToMonth(close.getFullYear(), close.getMonth() + 1, dueDay)
  if (due < close) due = clampToMonth(close.getFullYear(), close.getMonth() + 2, dueDay)
  if (due < today) {
    // The due date for the most recent close has already passed (overdue) —
    // still report it, callers compare against `today` to detect that.
    return due
  }
  return due
}

/** Greater of a flat percentage or a floor amount, never more than the
 * balance itself (so a near-zero balance doesn't produce a minimum due
 * larger than what's owed). */
export function minimumDue(statementBalance: number): number {
  if (statementBalance <= 0) return 0
  const computed = Math.max(statementBalance * MIN_PAYMENT_RULE.percent, MIN_PAYMENT_RULE.floor)
  return Math.round(Math.min(computed, statementBalance) * 100) / 100
}

/** Rough one-month interest estimate if only the minimum is paid — the
 * portion of the statement balance left after the minimum, at the monthly
 * rate implied by the APR. Display-only, non-compounding. */
export function interestIfMinimumOnly(
  statementBalance: number,
  minDue: number,
  apr: number | null | undefined
): number {
  if (!apr || statementBalance <= 0) return 0
  const remaining = Math.max(statementBalance - minDue, 0)
  return Math.round(((remaining * apr) / 12 / 100) * 100) / 100
}

export function utilization(balanceOwed: number, creditLimit: number | null | undefined): number {
  if (!creditLimit || creditLimit <= 0) return 0
  return Math.min(Math.max(balanceOwed / creditLimit, 0), 1)
}

const DUE_SOON_WINDOW_DAYS = 7

export function daysUntil(date: Date, today: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.round((startOfDate.getTime() - startOfToday.getTime()) / msPerDay)
}

/** Derives a card's payment status from what's owed, the current statement
 * balance, and how many days remain until the due date. */
export function paymentStatus(
  balanceOwed: number,
  statementBalance: number,
  daysUntilDue: number
): PaymentStatus {
  if (statementBalance <= 0 || balanceOwed <= 0) return "paid"
  if (daysUntilDue < 0) return "overdue"
  if (daysUntilDue <= DUE_SOON_WINDOW_DAYS) return "due_soon"
  return "current"
}
