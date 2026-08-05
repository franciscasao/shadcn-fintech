import { relations, sql } from "drizzle-orm"
import {
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core"

// ---------------------------------------------------------------------------
// Drizzle schema for the shadcn-fintech SQLite backend.
//
// Everything is scoped to a single seeded demo user (see DEMO_USER_ID in
// src/server/db/index.ts) — there's no auth, but the user_id column is kept
// on every table so real multi-user auth can be layered in later without a
// schema rewrite.
// ---------------------------------------------------------------------------

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  avatar: text("avatar").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
})

// ── Contacts (Quick Transfer targets) ───────────────────────────────────────
export const contacts = sqliteTable("contacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  avatar: text("avatar").notNull(),
})

// ── Bank accounts ────────────────────────────────────────────────────────────
export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  type: text("type", { enum: ["checking", "savings", "crypto", "investment"] }).notNull(),
  institution: text("institution").notNull(),
  institutionLogo: text("institution_logo").notNull(),
  accountNumber: text("account_number").notNull(),
  balance: real("balance").notNull().default(0),
  currency: text("currency").notNull().default("₱"),
  change: real("change").notNull().default(0),
  changePercent: real("change_percent").notNull().default(0),
  lastActivity: text("last_activity").notNull(),
  color: text("color").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),

  // ── PH institution template fields (see @/lib/ph-institutions) ──────────
  // templateId is null for accounts created via the "custom institution"
  // escape hatch — everything below is then user-entered instead of
  // template-derived.
  templateId: text("template_id"),
  institutionKind: text("institution_kind", {
    enum: ["universal", "commercial", "thrift", "rural", "digital", "ewallet", "broker", "crypto"],
  }),
  pdicInsured: integer("pdic_insured", { mode: "boolean" }).notNull().default(false),

  // interest
  interestRate: real("interest_rate"),
  creditingFrequency: text("crediting_frequency", {
    enum: ["daily", "monthly", "quarterly", "maturity", "none"],
  })
    .notNull()
    .default("none"),
  creditingTiming: text("crediting_timing", {
    enum: ["start_of_day", "end_of_day", "month_end", "maturity"],
  }),
  compounding: integer("compounding", { mode: "boolean" }).notNull().default(false),

  // balance rules
  maintainingBalance: real("maintaining_balance"),
  requiredAdb: real("required_adb"),
  interestCap: real("interest_cap"),

  // fees & limits
  monthlyFee: real("monthly_fee"),
  freeTransfersPerMonth: integer("free_transfers_per_month"),
  instapayFee: real("instapay_fee"),
  pesonetFee: real("pesonet_fee"),
  dailyTransferLimit: real("daily_transfer_limit"),
})

// ── Cards ────────────────────────────────────────────────────────────────────
export const cards = sqliteTable("cards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  type: text("type", { enum: ["physical", "virtual"] }).notNull(),
  last4: text("last4").notNull(),
  cardNumber: text("card_number").notNull(),
  holder: text("holder").notNull(),
  expiry: text("expiry").notNull(),
  cvv: text("cvv").notNull(),
  network: text("network", { enum: ["visa", "mastercard"] }).notNull(),
  frozen: integer("frozen", { mode: "boolean" }).notNull().default(false),
  dailyLimit: real("daily_limit").notNull(),
  monthlySpend: real("monthly_spend").notNull().default(0),
  monthlyLimit: real("monthly_limit").notNull(),
  color: text("color").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),

  // ── Issuing bank (see @/lib/ph-cards + @/lib/ph-institutions) ───────────
  // accountId is the funding account when the card was issued from a linked
  // account (nullable — credit cards need no funding account). issuer/
  // issuerLogo are always populated (from the template, or user-entered for
  // the "custom issuer" escape hatch); issuerTemplateId is null in that case.
  accountId: integer("account_id").references(() => accounts.id),
  issuer: text("issuer").notNull().default(""),
  issuerLogo: text("issuer_logo").notNull().default(""),
  issuerTemplateId: text("issuer_template_id"),
  product: text("product", { enum: ["debit", "credit", "prepaid"] }).notNull().default("debit"),
})

// ── Transactions (the ledger) ───────────────────────────────────────────────
export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  accountId: integer("account_id").references(() => accounts.id),
  cardId: integer("card_id").references(() => cards.id),
  merchant: text("merchant").notNull(),
  transactionId: text("transaction_id").notNull(),
  amount: real("amount").notNull(),
  date: text("date").notNull(), // ISO YYYY-MM-DD
  logo: text("logo").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  status: text("status", { enum: ["completed", "pending", "failed"] }).notNull(),
  type: text("type", { enum: ["expense", "income"] }).notNull(),
  notes: text("notes"),
  merchantInfo: text("merchant_info"),
  // Set on both legs of an account-to-account transfer (see `transfers` below)
  // so analytics can exclude internal movement from income/spending totals.
  transferId: integer("transfer_id").references(() => transfers.id),
})

// ── Transfers ────────────────────────────────────────────────────────────────
// Two flavors share this table: "external" (send to a contact — contactId
// set, toAccountId null) and "internal" (move money between the user's own
// accounts — contactId null, toAccountId set). accountId is always the
// *sending* account.
export const transfers = sqliteTable("transfers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  contactId: integer("contact_id").references(() => contacts.id),
  accountId: integer("account_id").references(() => accounts.id),
  toAccountId: integer("to_account_id").references(() => accounts.id),
  kind: text("kind", { enum: ["external", "internal"] }).notNull().default("external"),
  type: text("type", { enum: ["sent", "received", "scheduled"] }).notNull(),
  amount: real("amount").notNull(),
  date: text("date").notNull(), // ISO YYYY-MM-DD
  status: text("status", { enum: ["completed", "pending", "scheduled"] }).notNull(),
  note: text("note"),
})

// ── Notifications ────────────────────────────────────────────────────────────
export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type", {
    enum: ["transaction", "security", "system", "promotion", "request"],
  }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  time: text("time").notNull(),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  icon: text("icon").notNull(),
  // JSON-encoded { accept, decline, amount?, from?, fromAvatar? } or null
  actionable: text("actionable"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
})

// ── Categories (user-managed; transactions.category stores the name as free
// text, kept in sync on rename via the mutation layer — see
// src/server/mutations/categories.ts) ───────────────────────────────────────
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  iconName: text("icon_name").notNull(),
  color: text("color").notNull(),
  // Which of the 8 analytics/budget buckets this category rolls up into.
  // Null excludes it from spending aggregates (as "Income" is today).
  budgetBucket: text("budget_bucket"),
})

// ── Budget categories ────────────────────────────────────────────────────────
export const budgetCategories = sqliteTable("budget_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  category: text("category").notNull(),
  iconName: text("icon_name").notNull(),
  budget: real("budget").notNull(),
  color: text("color").notNull(),
})

// ── Savings goals ────────────────────────────────────────────────────────────
export const savingsGoals = sqliteTable("savings_goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  targetAmount: real("target_amount").notNull(),
  currentAmount: real("current_amount").notNull().default(0),
  deadline: text("deadline").notNull(),
  iconName: text("icon_name").notNull(),
  monthlyContribution: real("monthly_contribution").notNull().default(0),
})

// ── Relations (used for FK joins in the query layer) ────────────────────────
export const accountsRelations = relations(accounts, ({ many }) => ({
  transactions: many(transactions),
  cards: many(cards),
}))

export const cardsRelations = relations(cards, ({ one, many }) => ({
  transactions: many(transactions),
  account: one(accounts, { fields: [cards.accountId], references: [accounts.id] }),
}))

export const contactsRelations = relations(contacts, ({ many }) => ({
  transfers: many(transfers),
}))

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, { fields: [transactions.accountId], references: [accounts.id] }),
  card: one(cards, { fields: [transactions.cardId], references: [cards.id] }),
  transfer: one(transfers, { fields: [transactions.transferId], references: [transfers.id] }),
}))

export const transfersRelations = relations(transfers, ({ one }) => ({
  contact: one(contacts, { fields: [transfers.contactId], references: [contacts.id] }),
  toAccount: one(accounts, { fields: [transfers.toAccountId], references: [accounts.id] }),
  account: one(accounts, { fields: [transfers.accountId], references: [accounts.id] }),
}))
