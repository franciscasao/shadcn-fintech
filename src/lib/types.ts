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
  status: "completed" | "pending" | "failed"
  type: "expense" | "income"
  notes?: string
  merchantInfo?: string
  cardLast4?: string
  transferId?: number
}

// ── Cards page ───────────────────────────────────────────────────────────────
export type CardData = {
  id: string
  name: string
  type: "physical" | "virtual"
  last4: string
  cardNumber: string
  holder: string
  expiry: string
  cvv: string
  network: "visa" | "mastercard"
  frozen: boolean
  dailyLimit: number
  monthlySpend: number
  monthlyLimit: number
  color: string
}

// ── Analytics page ──────────────────────────────────────────────────────────
export type SpendingHeatmapDay = { date: string; amount: number }

export type CategoryBreakdown = {
  category: string
  amount: number
  color: string
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
