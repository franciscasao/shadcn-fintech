import { addDays, addMonths, format, formatDistanceToNow, subMinutes } from "date-fns"

import { avatar, logo } from "@/lib/media"
import { getInstitution } from "@/lib/ph-institutions"
import { DEFAULT_USER, budgetBucketReference } from "@/server/db/reference"
import type {
  BankAccount,
  CardData,
  FullTransaction,
  Notification,
  SavingsGoal,
  TransferRecord,
} from "@/lib/types"

// ---------------------------------------------------------------------------
// Curated DEMO fixtures for the SQLite database — fictional accounts, cards,
// transfers, notifications, and transactions, layered on top of the
// reference vocabulary in @/server/db/reference. Only consumed by
// src/server/db/seed.ts (dev-only — see the guard there); the running app
// never imports this file directly.
//
// Anything with a date is a function of `anchor` (the seed's "today", passed
// in by seed.ts as today() from @/lib/today) rather than a fixed calendar
// date, so a fresh `pnpm db:reset` always lands inside "this month" / "last
// 30 days" / the current credit-card statement cycle, no matter when it's
// run. See the CATEGORY_TO_BUDGET_BUCKET / categoryFixtures / budget bucket
// names in @/server/db/reference for the non-fictional part of this data.
// ---------------------------------------------------------------------------

// ── Contacts ─────────────────────────────────────────────────────────────────
export const contactFixtures = [
  { name: "Sarah Chen", avatar: avatar(1) },
  { name: "Marcus Johnson", avatar: avatar(3) },
  { name: "Elena Rodriguez", avatar: avatar(5) },
  { name: "James Wilson", avatar: avatar(8) },
  { name: "Aisha Patel", avatar: avatar(9) },
  { name: "David Kim", avatar: avatar(11) },
  { name: "Olivia Brown", avatar: avatar(16) },
  { name: "Liam Murphy", avatar: avatar(12) },
]

// ── Bank accounts ────────────────────────────────────────────────────────────
// Product fields (interest rate, crediting schedule, PDIC status, fees...)
// are pulled from the PH institution registry (@/lib/ph-institutions) so the
// seed data and the "link an account" templates never drift apart. Only the
// per-account numbers (balance, masked account number, display name) are
// hand-authored here.
type AccountFixtureOverrides = {
  name: string
  accountNumber: string
  balance: number
  change: number
  changePercent: number
  lastActivity: string
  type?: BankAccount["type"]
}

function fromTemplate(
  templateId: string,
  overrides: AccountFixtureOverrides
): Omit<BankAccount, "id"> {
  const t = getInstitution(templateId)
  if (!t) throw new Error(`Unknown institution template: ${templateId}`)
  return {
    name: overrides.name,
    type: overrides.type ?? t.defaultType,
    institution: t.name,
    institutionLogo: t.logo,
    accountNumber: overrides.accountNumber,
    balance: overrides.balance,
    currency: "₱",
    change: overrides.change,
    changePercent: overrides.changePercent,
    lastActivity: overrides.lastActivity,
    color: t.color,
    templateId: t.id,
    institutionKind: t.kind,
    pdicInsured: t.pdicInsured,
    interestRate: t.interestRate ?? null,
    creditingFrequency: t.creditingFrequency,
    creditingTiming: t.creditingTiming ?? null,
    compounding: t.compounding,
    maintainingBalance: t.maintainingBalance ?? null,
    requiredAdb: t.requiredAdb ?? null,
    interestCap: t.interestCap ?? null,
    monthlyFee: t.monthlyFee ?? null,
    freeTransfersPerMonth: t.freeTransfersPerMonth ?? null,
    instapayFee: t.instapayFee ?? null,
    pesonetFee: t.pesonetFee ?? null,
    dailyTransferLimit: t.dailyTransferLimit ?? null,
  }
}

export const accountFixtures: Omit<BankAccount, "id">[] = [
  fromTemplate("bpi", {
    name: "Primary Checking",
    accountNumber: "****4589",
    balance: 24850.42,
    change: 1240.0,
    changePercent: 5.2,
    lastActivity: "Today",
  }),
  fromTemplate("maribank-ph", {
    name: "MariBank Savings",
    accountNumber: "****7821",
    balance: 35200.0,
    change: 880.5,
    changePercent: 2.6,
    lastActivity: "Yesterday",
  }),
  fromTemplate("coins-ph", {
    name: "Crypto Wallet",
    accountNumber: "****3bc9",
    balance: 18450.8,
    change: -620.3,
    changePercent: -3.2,
    lastActivity: "2 hours ago",
  }),
  fromTemplate("col-financial", {
    name: "Brokerage Account",
    accountNumber: "****9012",
    balance: 61450.0,
    change: 2840.0,
    changePercent: 4.8,
    lastActivity: "Today",
  }),
  fromTemplate("maya-bank", {
    name: "Travel Fund",
    accountNumber: "****5567",
    balance: 4200.0,
    change: 400.0,
    changePercent: 10.5,
    lastActivity: "3 days ago",
  }),
  fromTemplate("gcash", {
    name: "GCash Wallet",
    accountNumber: "****8834",
    balance: 8750.0,
    change: 320.0,
    changePercent: 3.8,
    lastActivity: "Today",
  }),
]

// ── Cards ────────────────────────────────────────────────────────────────────
// Issuer fields (issuer name, logo, color) are pulled from the PH
// institution registry (@/lib/ph-institutions), same as accountFixtures
// above, so the seed data and the "issue a card" templates never drift
// apart. `accountName` is resolved to a funding-account id in seed.ts —
// null for credit cards, which draw on a credit line rather than a
// deposit account. Credit terms (creditLimit/apr/statementDay/dueDay) are
// only meaningful — and only ever set below — on product: "credit" cards;
// `credit` itself (the derived balance-owed summary, see @/lib/credit) is
// excluded from this fixture shape since it's computed from the ledger at
// read time, never stored.
type CardFixtureOverrides = {
  name: string
  last4: string
  expiry: string
  network: CardData["network"]
  type: CardData["type"]
  product: CardData["product"]
  frozen?: boolean
  dailyLimit: number
  monthlyLimit: number
  accountName: string | null
  creditLimit?: number
  apr?: number
  statementDay?: number
  dueDay?: number
}

function cardFromTemplate(
  templateId: string,
  overrides: CardFixtureOverrides
): Omit<CardData, "id" | "monthlySpend" | "accountId" | "credit"> & { accountName: string | null } {
  const t = getInstitution(templateId)
  if (!t) throw new Error(`Unknown institution template: ${templateId}`)
  return {
    name: overrides.name,
    type: overrides.type,
    last4: overrides.last4,
    holder: DEFAULT_USER.name.toUpperCase(),
    expiry: overrides.expiry,
    network: overrides.network,
    frozen: overrides.frozen ?? false,
    dailyLimit: overrides.dailyLimit,
    monthlyLimit: overrides.monthlyLimit,
    color: t.color,
    accountName: overrides.accountName,
    issuer: t.name,
    issuerLogo: t.logo,
    issuerTemplateId: t.id,
    product: overrides.product,
    creditLimit: overrides.creditLimit ?? null,
    apr: overrides.apr ?? null,
    statementDay: overrides.statementDay ?? null,
    dueDay: overrides.dueDay ?? null,
  }
}

/** Curated cards, as a function of the seed's anchor date — expiry dates
 * stay comfortably in the future no matter when this is seeded, and the
 * Business Expense card's statement/due days are derived so its most recent
 * due date always falls a few days before `anchor`, demonstrating "overdue"
 * (see the comment on that card below). seed.ts asserts this actually holds
 * after seeding, since the derivation is date-arithmetic and not proof-proof
 * at every possible anchor day (see the comment there). */
export function cardFixtures(
  anchor: Date
): (Omit<CardData, "id" | "monthlySpend" | "accountId" | "credit"> & { accountName: string | null })[] {
  const expiry = (monthsFromAnchor: number) => format(addMonths(anchor, monthsFromAnchor), "MM/yy")

  // Target the most recent due date ~5 days before the anchor, and back out
  // a statement close ~14 days before that — see lastStatementClose /
  // nextDueDate in @/lib/credit for the exact mechanics this is reproducing.
  const targetDue = addDays(anchor, -5)
  const overdueDueDay = targetDue.getDate()
  const overdueStatementDay = addDays(targetDue, -14).getDate()

  return [
    cardFromTemplate("bpi", {
      name: "Main Debit",
      type: "physical",
      product: "debit",
      last4: "4589",
      expiry: expiry(29),
      network: "visa",
      dailyLimit: 5000,
      monthlyLimit: 10000,
      accountName: "Primary Checking",
    }),
    cardFromTemplate("metrobank", {
      name: "Travel Credit",
      type: "physical",
      product: "credit",
      last4: "7321",
      expiry: expiry(11),
      network: "mastercard",
      dailyLimit: 3000,
      monthlyLimit: 8000,
      accountName: null,
      // Paid off via cardPaymentFixtures below — demonstrates the "paid"
      // state. paymentStatus() treats balanceOwed <= 0 as "paid" outright,
      // so statementDay/dueDay here don't need to be anchor-relative.
      creditLimit: 60000,
      apr: 32,
      statementDay: 15,
      dueDay: 5,
    }),
    cardFromTemplate("maya-bank", {
      name: "Virtual Shopping",
      type: "virtual",
      product: "debit",
      last4: "9012",
      expiry: expiry(8),
      network: "visa",
      dailyLimit: 1000,
      monthlyLimit: 3000,
      accountName: "Travel Fund",
    }),
    cardFromTemplate("bdo", {
      name: "Business Expense",
      type: "physical",
      product: "credit",
      last4: "3456",
      expiry: expiry(38),
      network: "mastercard",
      frozen: true,
      dailyLimit: 10000,
      monthlyLimit: 25000,
      accountName: null,
      // No payment fixtures below — demonstrates "overdue".
      creditLimit: 150000,
      apr: 39,
      statementDay: overdueStatementDay,
      dueDay: overdueDueDay,
    }),
    cardFromTemplate("gcash", {
      name: "GCash Virtual",
      type: "virtual",
      product: "prepaid",
      last4: "2201",
      expiry: expiry(33),
      network: "mastercard",
      dailyLimit: 1000,
      monthlyLimit: 3000,
      accountName: "GCash Wallet",
    }),
  ]
}

// ── Transfers (contactName is resolved to a contact id in seed.ts; all
// seeded transfers are external/contact-based — kind defaults to "external"
// at the schema level, see @/server/db/schema). dayOffset is relative to the
// seed anchor — negative is in the past (completed/pending), positive is in
// the future (the deliberately still-"scheduled" rows) ─────────────────────
const TRANSFER_FIXTURES: (Omit<TransferRecord, "id" | "kind" | "contactAvatar" | "date"> & {
  contactName: string
  dayOffset: number
})[] = [
  { type: "sent", contactName: "Sarah Chen", amount: 250.0, dayOffset: 0, status: "completed", note: "Dinner split" },
  { type: "received", contactName: "Marcus Johnson", amount: 1200.0, dayOffset: -1, status: "completed", note: "Freelance payment" },
  { type: "sent", contactName: "Elena Rodriguez", amount: 85.0, dayOffset: -2, status: "completed", note: "Concert tickets" },
  { type: "scheduled", contactName: "James Wilson", amount: 500.0, dayOffset: 8, status: "scheduled", note: "Monthly rent share" },
  { type: "received", contactName: "Aisha Patel", amount: 340.0, dayOffset: -3, status: "completed", note: "Birthday gift" },
  { type: "sent", contactName: "David Kim", amount: 45.0, dayOffset: -4, status: "pending" },
  { type: "scheduled", contactName: "Sarah Chen", amount: 250.0, dayOffset: 19, status: "scheduled", note: "Monthly dinner budget" },
  { type: "received", contactName: "Olivia Brown", amount: 175.0, dayOffset: -5, status: "completed" },
  { type: "sent", contactName: "Liam Murphy", amount: 920.0, dayOffset: -6, status: "completed", note: "Equipment purchase" },
  { type: "scheduled", contactName: "Elena Rodriguez", amount: 150.0, dayOffset: 13, status: "scheduled", note: "Gym membership split" },
]

export function transferFixtures(
  anchor: Date
): (Omit<TransferRecord, "id" | "kind" | "contactAvatar"> & { contactName: string })[] {
  return TRANSFER_FIXTURES.map(({ dayOffset, ...t }) => ({
    ...t,
    date: format(addDays(anchor, dayOffset), "yyyy-MM-dd"),
  }))
}

// ── Notifications ────────────────────────────────────────────────────────────
// Every row here corresponds to something actually seeded (a contact
// request, a curated transaction, the deliberately-overdue card, etc.) — no
// fabricated security alerts. A real deployment starts with zero
// notifications (see bootstrap.ts) since none of this is real activity.
//
// `minutesAgo` is relative to real wall-clock time (not the ledger anchor
// — a notification's "5 min ago" is about when it was seeded, not where it
// falls in the fictional ledger), and only exists to compute `createdAt`;
// the displayed "time ago" string is derived from that at read time (see
// toNotification in @/server/queries/notifications), not stored verbatim,
// so it stays accurate instead of freezing at whatever it said when seeded.
const NOTIFICATION_FIXTURES: (Omit<Notification, "id" | "time"> & { minutesAgo: number })[] = [
  { type: "request", title: "Money Request", description: "Elena Rodriguez is requesting ₱85.00 for concert tickets", minutesAgo: 0, read: false, icon: "hand-coins", actionable: { accept: "Pay ₱85.00", decline: "Decline", amount: "₱85.00", from: "Elena Rodriguez", fromAvatar: "/avatars/5.jpg" } },
  { type: "request", title: "Split Bill Request", description: "Marcus Johnson wants to split a ₱240.00 dinner bill (your share: ₱80.00)", minutesAgo: 30, read: false, icon: "split", actionable: { accept: "Pay ₱80.00", decline: "Decline", amount: "₱80.00", from: "Marcus Johnson", fromAvatar: "/avatars/3.jpg" } },
  { type: "transaction", title: "Payment Received", description: "You received ₱4,250.00 from Stripe Payout", minutesAgo: 2, read: false, icon: "arrow-down-left" },
  { type: "transaction", title: "Card Payment", description: "You paid ₱120.00 to AWS Cloud Services", minutesAgo: 3 * 60, read: false, icon: "credit-card" },
  // Reflects the "overdue" state seeded on the Business Expense card (see
  // its statementDay/dueDay comment in cardFixtures above) — no exact
  // amount, since the ledger total it owes depends on the random card
  // assignment in generateLedger().
  { type: "transaction", title: "Payment Overdue", description: "Your Business Expense card payment is overdue — pay now to avoid additional interest", minutesAgo: 4 * 60, read: false, icon: "credit-card" },
  { type: "system", title: "Budget Alert", description: "You've reached 90% of your Food & Dining budget", minutesAgo: 5 * 60, read: true, icon: "alert-triangle" },
  { type: "transaction", title: "Transfer Completed", description: "Your transfer of ₱250.00 to Sarah Chen was successful", minutesAgo: 24 * 60, read: true, icon: "check-circle" },
  { type: "transaction", title: "Subscription Renewed", description: "Spotify Premium was renewed for ₱9.99", minutesAgo: 2 * 24 * 60, read: true, icon: "repeat" },
  { type: "system", title: "Card Expiring Soon", description: "Your Travel Credit card ending in 7321 expires next month", minutesAgo: 3 * 24 * 60, read: true, icon: "clock" },
  { type: "transaction", title: "Dividend Received", description: "AAPL dividend payment of ₱142.50", minutesAgo: 5 * 24 * 60, read: true, icon: "trending-up" },
  { type: "system", title: "Monthly Statement Ready", description: "Your latest account statement is available for download", minutesAgo: 7 * 24 * 60, read: true, icon: "file-text" },
]

export function notificationFixtures(): (Omit<Notification, "id"> & { createdAt: string })[] {
  const now = new Date()
  return NOTIFICATION_FIXTURES.map(({ minutesAgo, ...n }) => {
    const createdAt = subMinutes(now, minutesAgo)
    return {
      ...n,
      // Vestigial — kept only to satisfy the NOT NULL column; never read
      // (see the comment above).
      time: formatDistanceToNow(createdAt, { addSuffix: true }),
      createdAt: createdAt.toISOString(),
    }
  })
}

// Both the category taxonomy and the budget-bucket names/icons/colors are
// pure reference data, identical for a demo account and a real one — see
// @/server/db/reference (also used by bootstrap.ts for a fresh production
// database). Re-exported here so seed.ts has one place to import all demo
// setup from.
export { categoryFixtures } from "@/server/db/reference"

// ── Budget categories — the reference buckets (name/icon/color) with
// invented target amounts layered on for the demo account; a real,
// bootstrapped account gets the same buckets with no amount set (budget: 0)
// until the owner configures them, see budgetBucketReference. ─────────────
const DEMO_BUDGET_AMOUNTS: Record<string, number> = {
  "Food & Dining": 800,
  Transport: 400,
  Entertainment: 300,
  Shopping: 500,
  Subscriptions: 200,
  Health: 150,
  Education: 250,
  Travel: 600,
}

export const budgetCategoryFixtures = budgetBucketReference.map((b) => ({
  ...b,
  budget: DEMO_BUDGET_AMOUNTS[b.category] ?? 0,
}))

// ── Savings goals — deadline is a display label N months out from the seed
// anchor, so it always reads as a future date. ─────────────────────────────
const SAVINGS_GOAL_FIXTURES: (Omit<SavingsGoal, "id" | "deadline"> & { monthsFromAnchor: number })[] = [
  { name: "Vacation Fund", targetAmount: 5000, currentAmount: 2400, monthsFromAnchor: 4, iconName: "palm-tree", monthlyContribution: 400 },
  { name: "Emergency Fund", targetAmount: 15000, currentAmount: 8200, monthsFromAnchor: 8, iconName: "shield", monthlyContribution: 850 },
  { name: "New Car", targetAmount: 35000, currentAmount: 12500, monthsFromAnchor: 14, iconName: "car", monthlyContribution: 1500 },
  { name: "Home Down Payment", targetAmount: 60000, currentAmount: 24000, monthsFromAnchor: 20, iconName: "home", monthlyContribution: 2000 },
]

export function savingsGoalFixtures(anchor: Date): Omit<SavingsGoal, "id">[] {
  return SAVINGS_GOAL_FIXTURES.map(({ monthsFromAnchor, ...g }) => ({
    ...g,
    deadline: format(addMonths(anchor, monthsFromAnchor), "MMM yyyy"),
  }))
}

// ── Curated "recent" transactions — a contiguous run ending 2 days before
// the seed anchor, so "last 30 days" / "this month" always have real rows
// in them regardless of when this is seeded. accountId/cardId are resolved
// from cardLast4 in seed.ts. ────────────────────────────────────────────────
const CURATED_TRANSACTION_FIXTURES: (Omit<FullTransaction, "id" | "cardLast4" | "date"> & {
  cardLast4?: string
  dayOffset: number
})[] = [
  { merchant: "Spotify", transactionId: "INV_920076", amount: -9.99, dayOffset: -2, logo: logo("spotify.com"), category: "Entertainment", status: "completed", type: "expense", merchantInfo: "Spotify AB, Stockholm, SE", cardLast4: "4589" },
  { merchant: "AWS Cloud Services", transactionId: "INV_918263", amount: -120.0, dayOffset: -3, logo: "/logos/aws-amazon-com.svg", category: "Technology", status: "completed", type: "expense", merchantInfo: "Amazon Web Services, Seattle, WA", cardLast4: "4589" },
  { merchant: "Stripe Payout", transactionId: "TXN_847291", amount: 4250.0, dayOffset: -4, logo: logo("stripe.com"), category: "Income", status: "completed", type: "income", merchantInfo: "Stripe Inc, San Francisco, CA" },
  { merchant: "Figma Pro", transactionId: "INV_773920", amount: -15.0, dayOffset: -5, logo: logo("figma.com"), category: "Design", status: "completed", type: "expense", merchantInfo: "Figma Inc, San Francisco, CA", cardLast4: "7321" },
  { merchant: "ChatGPT Plus", transactionId: "INV_920077", amount: -20.0, dayOffset: -6, logo: logo("openai.com"), category: "AI Tools", status: "completed", type: "expense", merchantInfo: "OpenAI LLC, San Francisco, CA", cardLast4: "4589" },
  { merchant: "Google Workspace", transactionId: "INV_661204", amount: -12.0, dayOffset: -7, logo: logo("google.com"), category: "Productivity", status: "completed", type: "expense", merchantInfo: "Google LLC, Mountain View, CA", cardLast4: "4589" },
  { merchant: "Client Payment", transactionId: "TXN_559831", amount: 8500.0, dayOffset: -8, logo: logo("paypal.com"), category: "Income", status: "completed", type: "income", merchantInfo: "PayPal Holdings, San Jose, CA" },
  { merchant: "Uber", transactionId: "INV_882341", amount: -24.5, dayOffset: -9, logo: logo("uber.com"), category: "Transport", status: "completed", type: "expense", merchantInfo: "Uber Technologies, San Francisco, CA", cardLast4: "9012" },
  { merchant: "Netflix", transactionId: "INV_773001", amount: -15.99, dayOffset: -10, logo: logo("netflix.com"), category: "Entertainment", status: "completed", type: "expense", merchantInfo: "Netflix Inc, Los Gatos, CA", cardLast4: "4589" },
  { merchant: "Amazon", transactionId: "INV_990123", amount: -89.99, dayOffset: -11, logo: logo("amazon.com"), category: "Shopping", status: "completed", type: "expense", merchantInfo: "Amazon.com Inc, Seattle, WA", cardLast4: "4589" },
  { merchant: "Starbucks", transactionId: "INV_445501", amount: -6.75, dayOffset: -12, logo: logo("starbucks.com"), category: "Food & Dining", status: "completed", type: "expense", cardLast4: "9012" },
  { merchant: "DoorDash", transactionId: "INV_334112", amount: -32.4, dayOffset: -13, logo: logo("doordash.com"), category: "Food & Dining", status: "completed", type: "expense", cardLast4: "4589" },
  { merchant: "Adobe Creative Cloud", transactionId: "INV_221098", amount: -54.99, dayOffset: -14, logo: logo("adobe.com"), category: "Design", status: "completed", type: "expense", merchantInfo: "Adobe Inc, San Jose, CA", cardLast4: "7321" },
  { merchant: "Slack", transactionId: "INV_110987", amount: -8.75, dayOffset: -15, logo: logo("slack.com"), category: "Productivity", status: "completed", type: "expense", cardLast4: "4589" },
  { merchant: "GitHub Pro", transactionId: "INV_998877", amount: -4.0, dayOffset: -16, logo: logo("github.com"), category: "Technology", status: "completed", type: "expense", merchantInfo: "GitHub Inc, San Francisco, CA", cardLast4: "4589" },
  { merchant: "Notion", transactionId: "INV_887766", amount: -10.0, dayOffset: -17, logo: logo("notion.so"), category: "Productivity", status: "pending", type: "expense", cardLast4: "7321" },
  { merchant: "Vercel Pro", transactionId: "INV_776655", amount: -20.0, dayOffset: -18, logo: logo("vercel.com"), category: "Technology", status: "completed", type: "expense", merchantInfo: "Vercel Inc, San Francisco, CA", cardLast4: "4589" },
  { merchant: "LinkedIn Premium", transactionId: "INV_665544", amount: -29.99, dayOffset: -19, logo: logo("linkedin.com"), category: "Productivity", status: "completed", type: "expense", cardLast4: "9012" },
  { merchant: "Apple iCloud+", transactionId: "INV_554433", amount: -2.99, dayOffset: -20, logo: logo("apple.com"), category: "Technology", status: "completed", type: "expense", cardLast4: "4589" },
  { merchant: "Airbnb Booking", transactionId: "INV_443322", amount: -245.0, dayOffset: -21, logo: logo("airbnb.com"), category: "Travel", status: "completed", type: "expense", merchantInfo: "Airbnb Inc, San Francisco, CA", cardLast4: "9012" },
  { merchant: "Freelance Project", transactionId: "TXN_332211", amount: 3200.0, dayOffset: -22, logo: logo("wise.com"), category: "Income", status: "completed", type: "income", merchantInfo: "Wise (TransferWise), London, UK" },
  { merchant: "Target", transactionId: "INV_221100", amount: -67.43, dayOffset: -23, logo: logo("target.com"), category: "Shopping", status: "completed", type: "expense", cardLast4: "9012" },
  { merchant: "Shell Gas", transactionId: "INV_110099", amount: -52.3, dayOffset: -24, logo: logo("shell.com"), category: "Transport", status: "failed", type: "expense", notes: "Card declined — insufficient funds", cardLast4: "7321" },
  { merchant: "Delta Airlines", transactionId: "INV_009988", amount: -389.0, dayOffset: -25, logo: logo("delta.com"), category: "Travel", status: "pending", type: "expense", merchantInfo: "Delta Air Lines, Atlanta, GA", cardLast4: "9012" },
  { merchant: "Dividend — AAPL", transactionId: "TXN_889977", amount: 142.5, dayOffset: -26, logo: logo("apple.com"), category: "Income", status: "completed", type: "income", notes: "Quarterly dividend payment" },
]

export function curatedTransactionFixtures(
  anchor: Date
): (Omit<FullTransaction, "id" | "cardLast4"> & { cardLast4?: string })[] {
  return CURATED_TRANSACTION_FIXTURES.map(({ dayOffset, ...t }) => ({
    ...t,
    date: format(addDays(anchor, dayOffset), "yyyy-MM-dd"),
  }))
}

// ── Card payments ────────────────────────────────────────────────────────────
// cardId/fromAccountId are resolved from cardLast4/fromAccountName in
// seed.ts — same resolution pattern as curatedTransactionFixtures' cardLast4
// and cardFixtures' accountName above. Seeded directly into card_payments
// with no matching transactions leg (unlike a live payment via
// createCardPayment in @/server/mutations/card-payments) — there's no
// precedent for that in this file either (transferFixtures are all
// single-leg "external" transfers; the linked-pair "internal" shape only
// ever gets created live), and getCards() derives balance owed straight
// from this table regardless.
//
// Travel Credit (7321) gets a partial payment followed by a payoff —
// demonstrating a payment history plus the "paid" status. Business Expense
// (3456) deliberately gets none, so its statement (see the "overdue"
// comment on its cardFixtures entry above) sits unpaid — demonstrating
// "overdue".
export type CardPaymentFixture = {
  cardLast4: string
  fromAccountName: string
  amount: number
  date: string
  status?: "completed" | "pending" | "scheduled"
  note?: string
}

const TRAVEL_CREDIT_PARTIAL_PAYMENT = 3000

/** The Travel Credit partial payment — fixed amount, ~6 weeks before the
 * anchor. Deliberately NOT enough on its own to zero the balance; see
 * payoffCardPaymentFixture below for the payment that finishes the job. */
export function cardPaymentFixtures(anchor: Date): CardPaymentFixture[] {
  return [
    {
      cardLast4: "7321",
      fromAccountName: "Primary Checking",
      amount: TRAVEL_CREDIT_PARTIAL_PAYMENT,
      date: format(addDays(anchor, -42), "yyyy-MM-dd"),
      note: "Partial payment",
    },
  ]
}

/** The Travel Credit payoff, sized to exactly clear `chargesTotal` (the sum
 * of every ledger charge seed.ts finds on that card) on top of the partial
 * payment above — so the "paid" demo state holds regardless of how
 * generateLedger()'s random card assignment landed, instead of relying on a
 * hardcoded amount that happened to be large enough. Inserted by seed.ts
 * AFTER the ledger, since chargesTotal isn't known until then. */
export function payoffCardPaymentFixture(anchor: Date, chargesTotal: number): CardPaymentFixture {
  return {
    cardLast4: "7321",
    fromAccountName: "Primary Checking",
    amount: Math.max(Math.round((chargesTotal - TRAVEL_CREDIT_PARTIAL_PAYMENT) * 100) / 100, 0),
    date: format(addDays(anchor, -7), "yyyy-MM-dd"),
    note: "Paid in full",
  }
}
