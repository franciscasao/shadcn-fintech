// Seeds the SQLite database with the FULL DEMO dataset (fictional user,
// accounts, cards, transactions, etc.) — for local development only. Every
// date is generated relative to real "today" (see today() in @/lib/today),
// so a fresh `pnpm db:reset` always lands inside the live app's date
// windows ("this month", "last 30 days", the current credit-card statement
// cycle), whatever day it's actually run.
//
// Destructive — clears every table before reseeding, with no confirmation.
// Refuses to run with NODE_ENV=production (see assertSafeToSeed) — a real
// deployment uses `pnpm db:bootstrap` instead (./bootstrap.ts), which only
// ever inserts, never deletes, and has none of the fictional content below.
//
// Run with: pnpm db:seed (or pnpm db:reset, which recreates the DB file first)

import { eq } from "drizzle-orm"

import { getDb, DEMO_USER_ID } from "./index"
import * as schema from "./schema"
import { today } from "@/lib/today"
import { DEFAULT_USER } from "./reference"
import { getCreditSummaryForCard } from "@/server/queries/cards"
import {
  accountFixtures,
  budgetCategoryFixtures,
  cardFixtures,
  cardPaymentFixtures,
  payoffCardPaymentFixture,
  categoryFixtures,
  contactFixtures,
  curatedTransactionFixtures,
  notificationFixtures,
  savingsGoalFixtures,
  transferFixtures,
} from "./fixtures"
import { generateLedger } from "./generate"

/** This script deletes every row in every table (see main() below) with no
 * confirmation prompt, so it must never run against real data. In practice
 * it already can't reach a production deployment — tsx/drizzle-kit aren't
 * in the runner image (see the Dockerfile) — but this is the guard for
 * anyone running it directly. */
function assertSafeToSeed() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "db:seed refuses to run with NODE_ENV=production — it deletes all data. Use `pnpm db:bootstrap` instead."
    )
  }
}

/** Sanity check for the two deliberately-staged credit-card demo states.
 * Both are derived from date arithmetic in ./fixtures (cardFixtures'
 * overdue statement/due days, payoffCardPaymentFixture's payoff amount)
 * that isn't guaranteed to land correctly at every possible anchor day —
 * see the comments there. Reuses the app's own getCreditSummaryForCard
 * rather than re-deriving the math, so this checks exactly what the UI will
 * show. Fails loudly here, at seed time, instead of silently showing the
 * wrong state in the app. */
async function assertDemoStatesHold(cardIdByLast4: Map<string, number>) {
  const db = getDb()
  const travelCreditId = cardIdByLast4.get("7321")
  const businessExpenseId = cardIdByLast4.get("3456")
  if (!travelCreditId || !businessExpenseId) return

  const travelCreditRow = db.select().from(schema.cards).where(eq(schema.cards.id, travelCreditId)).get()
  const businessExpenseRow = db
    .select()
    .from(schema.cards)
    .where(eq(schema.cards.id, businessExpenseId))
    .get()
  if (!travelCreditRow || !businessExpenseRow) return

  const [travelCredit, businessExpense] = await Promise.all([
    getCreditSummaryForCard(travelCreditRow),
    getCreditSummaryForCard(businessExpenseRow),
  ])

  if (travelCredit?.status !== "paid") {
    throw new Error(
      `Expected Travel Credit (7321) to be "paid" after seeding, got "${travelCredit?.status}" — see payoffCardPaymentFixture in ./fixtures.ts.`
    )
  }
  if (businessExpense?.status !== "overdue") {
    throw new Error(
      `Expected Business Expense (3456) to be "overdue" after seeding, got "${businessExpense?.status}" — ` +
        `the statement/due days derived in cardFixtures() (./fixtures.ts) don't land as overdue for every ` +
        `anchor day of the month (see the comment there). Try reseeding, or adjust the derivation.`
    )
  }
}

async function main() {
  assertSafeToSeed()
  const db = getDb()
  const anchor = today()

  console.log("Clearing existing data...")
  db.delete(schema.transactions).run()
  db.delete(schema.cardPayments).run()
  db.delete(schema.transfers).run()
  db.delete(schema.notifications).run()
  db.delete(schema.budgetCategories).run()
  db.delete(schema.categories).run()
  db.delete(schema.savingsGoals).run()
  db.delete(schema.cards).run()
  db.delete(schema.accounts).run()
  db.delete(schema.contacts).run()
  db.delete(schema.users).run()

  console.log("Seeding user...")
  db.insert(schema.users)
    .values({ id: DEMO_USER_ID, ...DEFAULT_USER })
    .run()

  console.log("Seeding contacts...")
  const insertedContacts = db
    .insert(schema.contacts)
    .values(contactFixtures.map((c) => ({ ...c, userId: DEMO_USER_ID })))
    .returning()
    .all()
  const contactIdByName = new Map(insertedContacts.map((c) => [c.name, c.id]))

  console.log("Seeding accounts...")
  const insertedAccounts = db
    .insert(schema.accounts)
    .values(accountFixtures.map((a) => ({ ...a, userId: DEMO_USER_ID })))
    .returning()
    .all()
  const accountIdByName = new Map(insertedAccounts.map((a) => [a.name, a.id]))
  const primaryAccountId = accountIdByName.get("Primary Checking")!

  console.log("Seeding cards...")
  const insertedCards = db
    .insert(schema.cards)
    .values(
      cardFixtures(anchor).map(({ accountName, ...c }) => {
        const accountId = accountName ? accountIdByName.get(accountName) ?? null : null
        if (accountName && accountId == null) {
          throw new Error(`Unknown card funding account: ${accountName}`)
        }
        return { ...c, monthlySpend: 0, accountId, userId: DEMO_USER_ID }
      })
    )
    .returning()
    .all()
  const cardIdByLast4 = new Map(insertedCards.map((c) => [c.last4, c.id]))
  const cardById = new Map(insertedCards.map((c) => [c.id, c]))
  // A transaction's account is whichever account funded the card it was
  // paid with (see the accountId comment on `cards` in ./schema) — falling
  // back to the primary account for card-less transactions (income). A
  // credit card purchase gets no account at all: it has no funding account
  // by design, and (unlike a debit/prepaid card) applying it to one here
  // would double-count it once createCardPayment pays the balance down —
  // see the accountId comment on NewTransactionInput in
  // @/server/mutations/transactions.
  function accountIdForCard(cardId: number | null): number | null {
    if (cardId == null) return primaryAccountId
    const card = cardById.get(cardId)
    if (card?.product === "credit") return null
    return card?.accountId ?? primaryAccountId
  }

  console.log("Seeding transfers...")
  db.insert(schema.transfers)
    .values(
      transferFixtures(anchor).map(({ contactName, ...t }) => {
        const contactId = contactIdByName.get(contactName)
        if (!contactId) throw new Error(`Unknown transfer contact: ${contactName}`)
        return { ...t, contactId, accountId: primaryAccountId, userId: DEMO_USER_ID }
      })
    )
    .run()

  console.log("Seeding notifications...")
  db.insert(schema.notifications)
    .values(
      notificationFixtures().map((n) => ({
        ...n,
        actionable: n.actionable ? JSON.stringify(n.actionable) : null,
        userId: DEMO_USER_ID,
      }))
    )
    .run()

  console.log("Seeding categories...")
  db.insert(schema.categories)
    .values(categoryFixtures.map((c) => ({ ...c, userId: DEMO_USER_ID })))
    .run()

  console.log("Seeding budget categories...")
  db.insert(schema.budgetCategories)
    .values(budgetCategoryFixtures.map((b) => ({ ...b, userId: DEMO_USER_ID })))
    .run()

  console.log("Seeding savings goals...")
  db.insert(schema.savingsGoals)
    .values(savingsGoalFixtures(anchor).map((g) => ({ ...g, userId: DEMO_USER_ID })))
    .run()

  console.log("Seeding curated transactions...")
  const curated = curatedTransactionFixtures(anchor)
  db.insert(schema.transactions)
    .values(
      curated.map(({ cardLast4, ...t }) => {
        const cardId = cardLast4 ? (cardIdByLast4.get(cardLast4) ?? null) : null
        return {
          ...t,
          accountId: accountIdForCard(cardId),
          cardId,
          userId: DEMO_USER_ID,
        }
      })
    )
    .run()

  console.log("Generating and seeding ledger history...")
  const ledger = generateLedger(anchor)
  const cardIds = insertedCards.map((c) => c.id)
  const CHUNK = 200
  for (let i = 0; i < ledger.length; i += CHUNK) {
    const chunk = ledger.slice(i, i + CHUNK).map((t) => {
      const cardId = t.type === "expense" ? cardIds[Math.floor(Math.random() * cardIds.length)] : null
      return {
        ...t,
        accountId: accountIdForCard(cardId),
        cardId,
        userId: DEMO_USER_ID,
      }
    })
    db.insert(schema.transactions).values(chunk).run()
  }

  // Card payments are seeded AFTER the ledger, not before: the Travel
  // Credit (7321) payoff needs to know exactly how much that card ended up
  // owing, which depends on generateLedger()'s random card assignment above
  // — see payoffCardPaymentFixture in ./fixtures.ts.
  console.log("Seeding card payments...")
  const travelCreditId = cardIdByLast4.get("7321")!
  const travelCreditCharges = db
    .select({ amount: schema.transactions.amount })
    .from(schema.transactions)
    .where(eq(schema.transactions.cardId, travelCreditId))
    .all()
  const chargesTotal = travelCreditCharges.reduce((sum, r) => sum + Math.abs(r.amount), 0)

  const cardPayments = [...cardPaymentFixtures(anchor), payoffCardPaymentFixture(anchor, chargesTotal)]
  db.insert(schema.cardPayments)
    .values(
      cardPayments.map(({ cardLast4, fromAccountName, ...p }) => {
        const cardId = cardIdByLast4.get(cardLast4)
        if (!cardId) throw new Error(`Unknown card payment card: ${cardLast4}`)
        const fromAccountId = accountIdByName.get(fromAccountName)
        if (!fromAccountId) throw new Error(`Unknown card payment account: ${fromAccountName}`)
        return { ...p, cardId, fromAccountId, userId: DEMO_USER_ID }
      })
    )
    .run()

  console.log("Verifying staged demo states...")
  await assertDemoStatesHold(cardIdByLast4)

  console.log(
    `Done. Seeded ${insertedAccounts.length} accounts, ${insertedCards.length} cards, ${
      curated.length + ledger.length
    } transactions.`
  )
}

main()
