// ---------------------------------------------------------------------------
// Domain types shared across the app. These used to live inline in
// src/data/seed.ts; they now describe both the remaining static datasets
// there and the shapes returned by the SQLite-backed query layer
// (src/server/queries/*), so presentational components never need to know
// whether their data came from a literal array or a database row.
// ---------------------------------------------------------------------------

// ── Contacts (Quick Transfer) ──────────────────────────────────────────────
export type Contact = {
  id: string
  name: string
  avatar: string
}

// ── Account Cards (dashboard wallet widget) ────────────────────────────────
export type AccountCard = {
  id: string
  label: string
  balance: string
  currency: string
  variant: "default" | "dark" | "primary"
}

// ── Recent Transactions (dashboard widget) ─────────────────────────────────
export type Transaction = {
  id: string
  merchant: string
  transactionId: string
  amount: number
  date: string
  logo: string
  category: string
}

// ── Transactions page ───────────────────────────────────────────────────────
export type FullTransaction = {
  id: string
  merchant: string
  transactionId: string
  amount: number
  date: string
  logo: string
  category: string
  subcategory?: string
  status: "completed" | "pending" | "failed"
  type: "expense" | "income"
  notes?: string
  merchantInfo?: string
  cardLast4?: string
  transferId?: number
  cardPaymentId?: number
  // Auto-generated leg of an internal (account-to-account) transfer — see
  // createInternalTransfer in @/server/mutations/transfers. These come in
  // linked pairs, so the delete UI refuses to remove just one leg. Always
  // populated by the query layer; optional only because the seed fixtures
  // in @/server/db/fixtures build this shape without it.
  isTransfer?: boolean
  // Auto-generated funding-account debit leg of a credit card payment — see
  // createCardPayment in @/server/mutations/card-payments. Single-legged
  // (the card side is derived, not a ledger row), but still not directly
  // deletable — delete the card payment instead. Same optional-for-fixtures
  // caveat as isTransfer.
  isCardPayment?: boolean
}

// ── Cards page ───────────────────────────────────────────────────────────────
// Shared with @/lib/ph-cards (the card-issuing-rules registry). Defined
// here, not there, so CardData can reference them without a
// types.ts <-> ph-cards.ts import cycle — same pattern as InstitutionKind
// below, shared with @/lib/ph-institutions.
export type CardNetwork = "visa" | "mastercard"
export type CardProduct = "debit" | "credit" | "prepaid"

export type CardData = {
  id: string
  name: string
  type: "physical" | "virtual"
  last4: string
  holder: string
  expiry: string
  network: CardNetwork
  frozen: boolean
  dailyLimit: number
  monthlySpend: number
  monthlyLimit: number
  color: string
  // Issuing bank (PH institution registry) this card was issued from.
  accountId: string | null
  accountName: string | null
  issuer: string
  issuerLogo: string
  issuerTemplateId: string | null
  product: CardProduct
  // Credit terms (product === "credit" only — null on debit/prepaid cards).
  creditLimit: number | null
  apr: number | null
  statementDay: number | null
  dueDay: number | null
  // Derived from the ledger (see getCards() in @/server/queries/cards) —
  // never stored, so it can't drift. Null on debit/prepaid cards.
  credit: CreditSummary | null
}

// See @/lib/credit for the statement-cycle math behind these fields.
export type CreditSummary = {
  /** Total currently owed (all card spend minus all completed payments). */
  balanceOwed: number
  availableCredit: number
  /** balanceOwed / creditLimit, clamped to [0, 1]. */
  utilization: number
  /** What's owed as of the last statement close — what the minimum/due
   * date/interest figures below are computed from. */
  statementBalance: number
  dueDate: string // ISO YYYY-MM-DD
  daysUntilDue: number
  minimumDue: number
  interestIfMinimumOnly: number
  status: "paid" | "current" | "due_soon" | "overdue"
}

export type CardPayment = {
  id: string
  cardId: string
  fromAccountId: string | null
  fromAccountName: string | null
  amount: number
  date: string
  status: "completed" | "pending" | "scheduled"
  note?: string
}

// ── Analytics page ──────────────────────────────────────────────────────────
export type SpendingHeatmapDay = { date: string; amount: number }

export type CategoryBreakdown = {
  category: string
  amount: number
  subcategories: { name: string; amount: number }[]
}

export type RecurringCharge = {
  id: string
  merchant: string
  logo: string
  amount: number
  frequency: "monthly" | "yearly"
  nextDate: string
  status: "wanted" | "review" | "unset"
  category: string
}

export type MonthComparison = { category: string; thisMonth: number; lastMonth: number }

export type AiInsight = {
  id: string
  text: string
  trend: "up" | "down" | "neutral"
  percentChange: number
  category: string
}

// ── Investments page (static) ───────────────────────────────────────────────
export type Holding = {
  id: string
  symbol: string
  name: string
  quantity: number
  avgBuyPrice: number
  currentPrice: number
  logo: string
  sparklineData: number[]
  sector: string
}

export type WatchlistItem = {
  id: string
  symbol: string
  name: string
  currentPrice: number
  dayChange: number
  logo: string
  sparklineData: number[]
}

export type PortfolioHistoryPoint = { date: string; portfolio: number; sp500: number }

// ── Budgets page ─────────────────────────────────────────────────────────────
// ── Categories (Settings page) ──────────────────────────────────────────────
export type Category = {
  id: string
  name: string
  iconName: string
  color: string
  budgetBucket: string | null
  transactionCount: number
}

export type BudgetCategory = {
  id: string
  category: string
  iconName: string
  budget: number
  spent: number
  color: string
  /** How many transaction categories currently roll up into this bucket via
   * categories.budgetBucket — powers the delete confirmation's impact copy. */
  categoryCount: number
}

export type SavingsGoal = {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string
  iconName: string
  monthlyContribution: number
}

export type DailySpending = { date: string; amount: number }

export type SpendingLimitSummary = {
  budget: number
  spent: number
  remaining: number
  currency: string
  periodStart: string
  periodEnd: string
}

// ── Accounts page ────────────────────────────────────────────────────────────
// Shared with @/lib/ph-institutions (the PH bank/e-wallet template registry).
// Defined here, not there, so BankAccount can reference them without a
// types.ts <-> ph-institutions.ts import cycle.
export type InstitutionKind =
  | "universal"
  | "commercial"
  | "thrift"
  | "rural"
  | "digital"
  | "ewallet"
  | "broker"
  | "crypto"

export type CreditingFrequency = "daily" | "monthly" | "quarterly" | "maturity" | "none"
export type CreditingTiming = "start_of_day" | "end_of_day" | "month_end" | "maturity"

export type BankAccount = {
  id: string
  name: string
  type: "checking" | "savings" | "crypto" | "investment"
  institution: string
  institutionLogo: string
  accountNumber: string
  balance: number
  currency: string
  change: number
  changePercent: number
  lastActivity: string
  color: string
  // PH institution template this account was created from, if any
  templateId: string | null
  institutionKind: InstitutionKind | null
  pdicInsured: boolean
  // interest
  interestRate: number | null
  creditingFrequency: CreditingFrequency
  creditingTiming: CreditingTiming | null
  compounding: boolean
  // balance rules
  maintainingBalance: number | null
  requiredAdb: number | null
  interestCap: number | null
  // fees & limits
  monthlyFee: number | null
  freeTransfersPerMonth: number | null
  instapayFee: number | null
  pesonetFee: number | null
  dailyTransferLimit: number | null
}

// ── Transfers page ───────────────────────────────────────────────────────────
export type TransferRecord = {
  id: string
  kind: "external" | "internal"
  type: "sent" | "received" | "scheduled"
  // External (contact) transfers
  contactName?: string
  contactAvatar?: string
  // Internal (account-to-account) transfers
  fromAccountName?: string
  toAccountName?: string
  amount: number
  date: string
  status: "completed" | "pending" | "scheduled"
  note?: string
}

// ── Notifications page ───────────────────────────────────────────────────────
export type Notification = {
  id: string
  type: "transaction" | "security" | "system" | "promotion" | "request"
  title: string
  description: string
  time: string
  read: boolean
  icon: string
  actionable?: {
    accept: string
    decline: string
    amount?: string
    from?: string
    fromAvatar?: string
  }
}

// ── Crypto page (static) ─────────────────────────────────────────────────────
export type CryptoCoin = {
  id: string
  symbol: string
  name: string
  logo: string
  price: number
  change24h: number
  change7d: number
  marketCap: number
  volume24h: number
  holdings: number
  sparklineData: number[]
}

export type CryptoTransaction = {
  id: string
  type: "buy" | "sell" | "swap" | "receive" | "send"
  coin: string
  coinSymbol: string
  logo: string
  amount: number
  value: number
  date: string
  status: "completed" | "pending"
}

// ── Financial Health Score widget (static) ──────────────────────────────────
export type HealthFactor = {
  id: string
  label: string
  score: number
  maxScore: number
  status: "excellent" | "good" | "fair" | "poor"
  description: string
}

// ── Help & Support page (static) ────────────────────────────────────────────
export type FaqItem = {
  id: string
  question: string
  answer: string
  category: "account" | "payments" | "security" | "billing" | "general"
}

export type SupportTicket = {
  id: string
  subject: string
  status: "open" | "in-progress" | "resolved"
  priority: "low" | "medium" | "high"
  createdAt: string
  lastUpdate: string
}
