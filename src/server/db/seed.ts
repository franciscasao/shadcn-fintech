// Seeds the SQLite database with the demo user and all fixture + generated
// data. Idempotent — clears existing rows first, so `pnpm db:seed` can be
// re-run any time (and is what `pnpm db:reset` calls after recreating the
// database file).
//
// Run with: pnpm db:seed

import { getDb, DEMO_USER_ID } from "./index"
import * as schema from "./schema"
import {
  accountFixtures,
  budgetCategoryFixtures,
  cardFixtures,
  cardPaymentFixtures,
  categoryFixtures,
  contactFixtures,
  curatedTransactionFixtures,
  notificationFixtures,
  savingsGoalFixtures,
  transferFixtures,
} from "./fixtures"
import { generateLedger } from "./generate"

async function main() {
  const db = getDb()

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
    .values({
      id: DEMO_USER_ID,
      name: "Alex Morgan",
      email: "alex.morgan@vault.dev",
      avatar: "/avatars/user.jpg",
    })
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
      cardFixtures.map(({ accountName, ...c }) => {
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

  console.log("Seeding card payments...")
  db.insert(schema.cardPayments)
    .values(
      cardPaymentFixtures.map(({ cardLast4, fromAccountName, ...p }) => {
        const cardId = cardIdByLast4.get(cardLast4)
        if (!cardId) throw new Error(`Unknown card payment card: ${cardLast4}`)
        const fromAccountId = accountIdByName.get(fromAccountName)
        if (!fromAccountId) throw new Error(`Unknown card payment account: ${fromAccountName}`)
        return { ...p, cardId, fromAccountId, userId: DEMO_USER_ID }
      })
    )
    .run()

  console.log("Seeding transfers...")
  db.insert(schema.transfers)
    .values(
      transferFixtures.map(({ contactName, ...t }) => {
        const contactId = contactIdByName.get(contactName)
        if (!contactId) throw new Error(`Unknown transfer contact: ${contactName}`)
        return { ...t, contactId, accountId: primaryAccountId, userId: DEMO_USER_ID }
      })
    )
    .run()

  console.log("Seeding notifications...")
  db.insert(schema.notifications)
    .values(
      notificationFixtures.map((n) => ({
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
    .values(savingsGoalFixtures.map((g) => ({ ...g, userId: DEMO_USER_ID })))
    .run()

  console.log("Seeding curated transactions...")
  db.insert(schema.transactions)
    .values(
      curatedTransactionFixtures.map(({ cardLast4, ...t }) => {
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
  const ledger = generateLedger()
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

  console.log(
    `Done. Seeded ${insertedAccounts.length} accounts, ${insertedCards.length} cards, ${
      curatedTransactionFixtures.length + ledger.length
    } transactions.`
  )
}

main()
