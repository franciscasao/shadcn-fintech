import { avatar, logo } from "@/lib/media"
import type {
  BankAccount,
  CardData,
  FullTransaction,
  Notification,
  SavingsGoal,
  TransferRecord,
} from "@/lib/types"

// ---------------------------------------------------------------------------
// Curated seed fixtures for the SQLite database — the original hand-written
// datasets from src/data/seed.ts for every domain that's now DB-backed
// (contacts, accounts, cards, transfers, notifications, budget categories,
// savings goals, and the 25 "recent" transactions). Only consumed by
// src/server/db/seed.ts; the running app never imports this file directly.
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
export const accountFixtures: Omit<BankAccount, "id">[] = [
  {
    name: "Primary Checking",
    type: "checking",
    institution: "Chase",
    institutionLogo: logo("chase.com"),
    accountNumber: "****4589",
    balance: 24850.42,
    currency: "₱",
    change: 1240.0,
    changePercent: 5.2,
    lastActivity: "Today",
    color: "bg-blue-500",
  },
  {
    name: "High-Yield Savings",
    type: "savings",
    institution: "Marcus by Goldman Sachs",
    institutionLogo: logo("marcus.com"),
    accountNumber: "****7821",
    balance: 35200.0,
    currency: "₱",
    change: 880.5,
    changePercent: 2.6,
    lastActivity: "Yesterday",
    color: "bg-emerald-500",
  },
  {
    name: "Bitcoin Wallet",
    type: "crypto",
    institution: "Coinbase",
    institutionLogo: logo("coinbase.com"),
    accountNumber: "****3bc9",
    balance: 18450.8,
    currency: "₱",
    change: -620.3,
    changePercent: -3.2,
    lastActivity: "2 hours ago",
    color: "bg-orange-500",
  },
  {
    name: "Brokerage Account",
    type: "investment",
    institution: "Fidelity",
    institutionLogo: logo("fidelity.com"),
    accountNumber: "****9012",
    balance: 61450.0,
    currency: "₱",
    change: 2840.0,
    changePercent: 4.8,
    lastActivity: "Today",
    color: "bg-violet-500",
  },
  {
    name: "Travel Fund",
    type: "savings",
    institution: "Ally Bank",
    institutionLogo: logo("ally.com"),
    accountNumber: "****5567",
    balance: 4200.0,
    currency: "₱",
    change: 400.0,
    changePercent: 10.5,
    lastActivity: "3 days ago",
    color: "bg-pink-500",
  },
  {
    name: "Wise Account",
    type: "checking",
    institution: "Wise",
    institutionLogo: logo("wise.com"),
    accountNumber: "****8834",
    balance: 8750.0,
    currency: "₱",
    change: 320.0,
    changePercent: 3.8,
    lastActivity: "Today",
    color: "bg-cyan-500",
  },
]

// ── Cards ────────────────────────────────────────────────────────────────────
export const cardFixtures: Omit<CardData, "id" | "monthlySpend">[] = [
  {
    name: "Main Debit",
    type: "physical",
    last4: "4589",
    cardNumber: "**** **** **** 4589",
    holder: "ALEX MORGAN",
    expiry: "09/28",
    cvv: "317",
    network: "visa",
    frozen: false,
    dailyLimit: 5000,
    monthlyLimit: 10000,
    color: "bg-primary text-primary-foreground",
  },
  {
    name: "Travel Credit",
    type: "physical",
    last4: "7321",
    cardNumber: "**** **** **** 7321",
    holder: "ALEX MORGAN",
    expiry: "03/27",
    cvv: "892",
    network: "mastercard",
    frozen: false,
    dailyLimit: 3000,
    monthlyLimit: 8000,
    color: "bg-secondary text-secondary-foreground",
  },
  {
    name: "Virtual Shopping",
    type: "virtual",
    last4: "9012",
    cardNumber: "**** **** **** 9012",
    holder: "ALEX MORGAN",
    expiry: "12/26",
    cvv: "445",
    network: "visa",
    frozen: false,
    dailyLimit: 1000,
    monthlyLimit: 3000,
    color: "bg-muted text-foreground",
  },
  {
    name: "Business Expense",
    type: "physical",
    last4: "3456",
    cardNumber: "**** **** **** 3456",
    holder: "ALEX MORGAN",
    expiry: "06/29",
    cvv: "661",
    network: "mastercard",
    frozen: true,
    dailyLimit: 10000,
    monthlyLimit: 25000,
    color: "bg-card text-card-foreground ring-1 ring-border",
  },
]

// ── Transfers (contactName is resolved to a contact id in seed.ts) ─────────
export const transferFixtures: (Omit<TransferRecord, "id" | "contactAvatar"> & {
  contactName: string
})[] = [
  { type: "sent", contactName: "Sarah Chen", amount: 250.0, date: "2026-04-12", status: "completed", note: "Dinner split" },
  { type: "received", contactName: "Marcus Johnson", amount: 1200.0, date: "2026-04-11", status: "completed", note: "Freelance payment" },
  { type: "sent", contactName: "Elena Rodriguez", amount: 85.0, date: "2026-04-10", status: "completed", note: "Concert tickets" },
  { type: "scheduled", contactName: "James Wilson", amount: 500.0, date: "2026-04-20", status: "scheduled", note: "Monthly rent share" },
  { type: "received", contactName: "Aisha Patel", amount: 340.0, date: "2026-04-09", status: "completed", note: "Birthday gift" },
  { type: "sent", contactName: "David Kim", amount: 45.0, date: "2026-04-08", status: "pending" },
  { type: "scheduled", contactName: "Sarah Chen", amount: 250.0, date: "2026-05-01", status: "scheduled", note: "Monthly dinner budget" },
  { type: "received", contactName: "Olivia Brown", amount: 175.0, date: "2026-04-07", status: "completed" },
  { type: "sent", contactName: "Liam Murphy", amount: 920.0, date: "2026-04-06", status: "completed", note: "Equipment purchase" },
  { type: "scheduled", contactName: "Elena Rodriguez", amount: 150.0, date: "2026-04-25", status: "scheduled", note: "Gym membership split" },
]

// ── Notifications ────────────────────────────────────────────────────────────
export const notificationFixtures: Omit<Notification, "id">[] = [
  { type: "request", title: "Money Request", description: "Elena Rodriguez is requesting ₱85.00 for concert tickets", time: "Just now", read: false, icon: "hand-coins", actionable: { accept: "Pay ₱85.00", decline: "Decline", amount: "₱85.00", from: "Elena Rodriguez", fromAvatar: "/avatars/5.jpg" } },
  { type: "security", title: "Authorize New Device", description: "Someone is trying to log in from a Windows PC in Berlin, Germany", time: "5 min ago", read: false, icon: "shield-alert", actionable: { accept: "Approve", decline: "Block" } },
  { type: "request", title: "Split Bill Request", description: "Marcus Johnson wants to split a ₱240.00 dinner bill (your share: ₱80.00)", time: "30 min ago", read: false, icon: "split", actionable: { accept: "Pay ₱80.00", decline: "Decline", amount: "₱80.00", from: "Marcus Johnson", fromAvatar: "/avatars/3.jpg" } },
  { type: "transaction", title: "Payment Received", description: "You received ₱4,250.00 from Stripe Payout", time: "2 min ago", read: false, icon: "arrow-down-left" },
  { type: "security", title: "New Login Detected", description: "Your account was accessed from a new device in San Francisco, CA", time: "1 hour ago", read: false, icon: "shield-alert" },
  { type: "transaction", title: "Card Payment", description: "You paid ₱120.00 to AWS Cloud Services", time: "3 hours ago", read: false, icon: "credit-card" },
  { type: "system", title: "Budget Alert", description: "You've reached 90% of your Food & Dining budget", time: "5 hours ago", read: true, icon: "alert-triangle" },
  { type: "promotion", title: "Upgrade to Vault Pro", description: "Get advanced analytics, unlimited virtual cards, and priority support", time: "1 day ago", read: true, icon: "sparkles" },
  { type: "transaction", title: "Transfer Completed", description: "Your transfer of ₱250.00 to Sarah Chen was successful", time: "1 day ago", read: true, icon: "check-circle" },
  { type: "security", title: "Password Changed", description: "Your account password was successfully updated", time: "2 days ago", read: true, icon: "lock" },
  { type: "transaction", title: "Subscription Renewed", description: "Spotify Premium was renewed for ₱9.99", time: "2 days ago", read: true, icon: "repeat" },
  { type: "system", title: "Card Expiring Soon", description: "Your Travel Credit card ending in 7321 expires next month", time: "3 days ago", read: true, icon: "clock" },
  { type: "transaction", title: "Dividend Received", description: "AAPL Q1 2026 dividend payment of ₱142.50", time: "5 days ago", read: true, icon: "trending-up" },
  { type: "system", title: "Monthly Statement Ready", description: "Your March 2026 account statement is available for download", time: "1 week ago", read: true, icon: "file-text" },
  { type: "security", title: "Two-Factor Enabled", description: "Two-factor authentication has been enabled on your account", time: "2 weeks ago", read: true, icon: "shield-check" },
]

// ── Budget categories (spending is derived from the ledger via SQL) ────────
export const budgetCategoryFixtures = [
  { category: "Food & Dining", iconName: "utensils", budget: 800, color: "text-orange-500" },
  { category: "Transport", iconName: "car", budget: 400, color: "text-blue-500" },
  { category: "Entertainment", iconName: "gamepad-2", budget: 300, color: "text-purple-500" },
  { category: "Shopping", iconName: "shopping-bag", budget: 500, color: "text-pink-500" },
  { category: "Subscriptions", iconName: "repeat", budget: 200, color: "text-cyan-500" },
  { category: "Health", iconName: "heart-pulse", budget: 150, color: "text-emerald-500" },
  { category: "Education", iconName: "graduation-cap", budget: 250, color: "text-amber-500" },
  { category: "Travel", iconName: "plane", budget: 600, color: "text-rose-500" },
]

// ── Savings goals ────────────────────────────────────────────────────────────
export const savingsGoalFixtures: Omit<SavingsGoal, "id">[] = [
  { name: "Vacation Fund", targetAmount: 5000, currentAmount: 2400, deadline: "Aug 2026", iconName: "palm-tree", monthlyContribution: 400 },
  { name: "Emergency Fund", targetAmount: 15000, currentAmount: 8200, deadline: "Dec 2026", iconName: "shield", monthlyContribution: 850 },
  { name: "New Car", targetAmount: 35000, currentAmount: 12500, deadline: "Jun 2027", iconName: "car", monthlyContribution: 1500 },
  { name: "Home Down Payment", targetAmount: 60000, currentAmount: 24000, deadline: "Dec 2027", iconName: "home", monthlyContribution: 2000 },
]

// ── Curated "recent" transactions (Mar 17 – Apr 10, 2026) ──────────────────
// Kept exactly as the original fullTransactions array, with display dates
// converted to ISO. accountId/cardId are resolved from cardLast4 in seed.ts.
export const curatedTransactionFixtures: (Omit<FullTransaction, "id" | "cardLast4"> & {
  cardLast4?: string
})[] = [
  { merchant: "Spotify", transactionId: "INV_920076", amount: -9.99, date: "2026-04-10", logo: logo("spotify.com"), category: "Entertainment", status: "completed", type: "expense", merchantInfo: "Spotify AB, Stockholm, SE", cardLast4: "4589" },
  { merchant: "AWS Cloud Services", transactionId: "INV_918263", amount: -120.0, date: "2026-04-09", logo: "/logos/aws-amazon-com.svg", category: "Technology", status: "completed", type: "expense", merchantInfo: "Amazon Web Services, Seattle, WA", cardLast4: "4589" },
  { merchant: "Stripe Payout", transactionId: "TXN_847291", amount: 4250.0, date: "2026-04-08", logo: logo("stripe.com"), category: "Income", status: "completed", type: "income", merchantInfo: "Stripe Inc, San Francisco, CA" },
  { merchant: "Figma Pro", transactionId: "INV_773920", amount: -15.0, date: "2026-04-07", logo: logo("figma.com"), category: "Design", status: "completed", type: "expense", merchantInfo: "Figma Inc, San Francisco, CA", cardLast4: "7321" },
  { merchant: "ChatGPT Plus", transactionId: "INV_920077", amount: -20.0, date: "2026-04-06", logo: logo("openai.com"), category: "AI Tools", status: "completed", type: "expense", merchantInfo: "OpenAI LLC, San Francisco, CA", cardLast4: "4589" },
  { merchant: "Google Workspace", transactionId: "INV_661204", amount: -12.0, date: "2026-04-05", logo: logo("google.com"), category: "Productivity", status: "completed", type: "expense", merchantInfo: "Google LLC, Mountain View, CA", cardLast4: "4589" },
  { merchant: "Client Payment", transactionId: "TXN_559831", amount: 8500.0, date: "2026-04-04", logo: logo("paypal.com"), category: "Income", status: "completed", type: "income", merchantInfo: "PayPal Holdings, San Jose, CA" },
  { merchant: "Uber", transactionId: "INV_882341", amount: -24.5, date: "2026-04-03", logo: logo("uber.com"), category: "Transport", status: "completed", type: "expense", merchantInfo: "Uber Technologies, San Francisco, CA", cardLast4: "9012" },
  { merchant: "Netflix", transactionId: "INV_773001", amount: -15.99, date: "2026-04-02", logo: logo("netflix.com"), category: "Entertainment", status: "completed", type: "expense", merchantInfo: "Netflix Inc, Los Gatos, CA", cardLast4: "4589" },
  { merchant: "Amazon", transactionId: "INV_990123", amount: -89.99, date: "2026-04-01", logo: logo("amazon.com"), category: "Shopping", status: "completed", type: "expense", merchantInfo: "Amazon.com Inc, Seattle, WA", cardLast4: "4589" },
  { merchant: "Starbucks", transactionId: "INV_445501", amount: -6.75, date: "2026-03-31", logo: logo("starbucks.com"), category: "Food & Dining", status: "completed", type: "expense", cardLast4: "9012" },
  { merchant: "DoorDash", transactionId: "INV_334112", amount: -32.4, date: "2026-03-30", logo: logo("doordash.com"), category: "Food & Dining", status: "completed", type: "expense", cardLast4: "4589" },
  { merchant: "Adobe Creative Cloud", transactionId: "INV_221098", amount: -54.99, date: "2026-03-29", logo: logo("adobe.com"), category: "Design", status: "completed", type: "expense", merchantInfo: "Adobe Inc, San Jose, CA", cardLast4: "7321" },
  { merchant: "Slack", transactionId: "INV_110987", amount: -8.75, date: "2026-03-28", logo: logo("slack.com"), category: "Productivity", status: "completed", type: "expense", cardLast4: "4589" },
  { merchant: "GitHub Pro", transactionId: "INV_998877", amount: -4.0, date: "2026-03-27", logo: logo("github.com"), category: "Technology", status: "completed", type: "expense", merchantInfo: "GitHub Inc, San Francisco, CA", cardLast4: "4589" },
  { merchant: "Notion", transactionId: "INV_887766", amount: -10.0, date: "2026-03-26", logo: logo("notion.so"), category: "Productivity", status: "pending", type: "expense", cardLast4: "7321" },
  { merchant: "Vercel Pro", transactionId: "INV_776655", amount: -20.0, date: "2026-03-25", logo: logo("vercel.com"), category: "Technology", status: "completed", type: "expense", merchantInfo: "Vercel Inc, San Francisco, CA", cardLast4: "4589" },
  { merchant: "LinkedIn Premium", transactionId: "INV_665544", amount: -29.99, date: "2026-03-24", logo: logo("linkedin.com"), category: "Productivity", status: "completed", type: "expense", cardLast4: "9012" },
  { merchant: "Apple iCloud+", transactionId: "INV_554433", amount: -2.99, date: "2026-03-23", logo: logo("apple.com"), category: "Technology", status: "completed", type: "expense", cardLast4: "4589" },
  { merchant: "Airbnb Booking", transactionId: "INV_443322", amount: -245.0, date: "2026-03-22", logo: logo("airbnb.com"), category: "Travel", status: "completed", type: "expense", merchantInfo: "Airbnb Inc, San Francisco, CA", cardLast4: "9012" },
  { merchant: "Freelance Project", transactionId: "TXN_332211", amount: 3200.0, date: "2026-03-21", logo: logo("wise.com"), category: "Income", status: "completed", type: "income", merchantInfo: "Wise (TransferWise), London, UK" },
  { merchant: "Target", transactionId: "INV_221100", amount: -67.43, date: "2026-03-20", logo: logo("target.com"), category: "Shopping", status: "completed", type: "expense", cardLast4: "9012" },
  { merchant: "Shell Gas", transactionId: "INV_110099", amount: -52.3, date: "2026-03-19", logo: logo("shell.com"), category: "Transport", status: "failed", type: "expense", notes: "Card declined — insufficient funds", cardLast4: "7321" },
  { merchant: "Delta Airlines", transactionId: "INV_009988", amount: -389.0, date: "2026-03-18", logo: logo("delta.com"), category: "Travel", status: "pending", type: "expense", merchantInfo: "Delta Air Lines, Atlanta, GA", cardLast4: "9012" },
  { merchant: "Dividend — AAPL", transactionId: "TXN_889977", amount: 142.5, date: "2026-03-17", logo: logo("apple.com"), category: "Income", status: "completed", type: "income", notes: "Q1 2026 dividend payment" },
]
