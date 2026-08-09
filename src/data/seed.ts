// ---------------------------------------------------------------------------
// Seed data – static/editorial fintech dashboard data
// ---------------------------------------------------------------------------
//
// This file used to hold every dataset the app rendered. It now only holds
// the remaining sample-data-only pages — crypto, investments, the dashboard
// health-score widget, AI insights, and FAQ/support — all marked as
// "preview" in the nav and on-page (see @/components/preview-banner and the
// Badge on health-score.tsx / ai-insights.tsx) since none of it is backed
// by real data yet.
//
// Everything else (accounts, transactions, transfers, cards, contacts,
// notifications, budgets, savings goals, and all analytics derived from
// them) is read from the database via src/server/queries/*.
//
// Domain types used to live inline here; they've moved to src/lib/types.ts
// and are re-exported below so existing `import type { X } from "@/data/seed"`
// call sites keep working unchanged.

import { logo } from "@/lib/media"

export type {
  Contact,
  AccountCard,
  Transaction,
  FullTransaction,
  CardData,
  SpendingHeatmapDay,
  CategoryBreakdown,
  RecurringCharge,
  MonthComparison,
  AiInsight,
  Holding,
  WatchlistItem,
  PortfolioHistoryPoint,
  BudgetCategory,
  SavingsGoal,
  DailySpending,
  BankAccount,
  TransferRecord,
  Notification,
  CryptoCoin,
  CryptoTransaction,
  HealthFactor,
  FaqItem,
  SupportTicket,
} from "@/lib/types"

import type {
  AiInsight,
  CryptoCoin,
  FaqItem,
  Holding,
  HealthFactor,
  PortfolioHistoryPoint,
  SupportTicket,
  WatchlistItem,
} from "@/lib/types"

// ══════════════════════════════════════════════════════════════════════════════
// PAGE DATA: Analytics — AI insights (editorial copy, not derived from the ledger)
// ══════════════════════════════════════════════════════════════════════════════

export const aiInsights: AiInsight[] = [
  { id: "ai1", text: "Your dining spending is up 19% this month — mostly DoorDash orders on weeknights.", trend: "up", percentChange: 19, category: "Food & Dining" },
  { id: "ai2", text: "Transport costs dropped 13% — great job using public transit more.", trend: "down", percentChange: 13, category: "Transport" },
  { id: "ai3", text: "You have 3 subscriptions flagged for review totaling ₱93.74/month.", trend: "neutral", percentChange: 0, category: "Subscriptions" },
  { id: "ai4", text: "Shopping jumped 37% — a ₱245 Airbnb booking and ₱90 Amazon order drove most of it.", trend: "up", percentChange: 37, category: "Shopping" },
  { id: "ai5", text: "You're on track to save ₱1,200 this month if spending stays consistent.", trend: "down", percentChange: 8, category: "Savings" },
]

// ══════════════════════════════════════════════════════════════════════════════
// PAGE DATA: Investments (static)
// ══════════════════════════════════════════════════════════════════════════════

function generateSparkline(base: number, volatility: number): number[] {
  const points: number[] = []
  let price = base
  for (let i = 0; i < 30; i++) {
    price += (Math.sin(i * 0.5) * volatility) + (Math.random() - 0.48) * volatility
    points.push(Math.round(price * 100) / 100)
  }
  return points
}

export const holdings: Holding[] = [
  { id: "h1", symbol: "AAPL", name: "Apple Inc", quantity: 25, avgBuyPrice: 178.50, currentPrice: 198.30, logo: logo("apple.com"), sparklineData: generateSparkline(198, 3), sector: "Technology" },
  { id: "h2", symbol: "GOOGL", name: "Alphabet Inc", quantity: 10, avgBuyPrice: 142.00, currentPrice: 168.75, logo: logo("google.com"), sparklineData: generateSparkline(168, 4), sector: "Technology" },
  { id: "h3", symbol: "MSFT", name: "Microsoft", quantity: 15, avgBuyPrice: 380.00, currentPrice: 425.60, logo: logo("microsoft.com"), sparklineData: generateSparkline(425, 5), sector: "Technology" },
  { id: "h4", symbol: "AMZN", name: "Amazon", quantity: 8, avgBuyPrice: 175.30, currentPrice: 192.40, logo: logo("amazon.com"), sparklineData: generateSparkline(192, 3), sector: "Consumer" },
  { id: "h5", symbol: "TSLA", name: "Tesla Inc", quantity: 12, avgBuyPrice: 245.00, currentPrice: 218.90, logo: logo("tesla.com"), sparklineData: generateSparkline(218, 8), sector: "Automotive" },
  { id: "h6", symbol: "NVDA", name: "NVIDIA", quantity: 20, avgBuyPrice: 480.00, currentPrice: 892.50, logo: logo("nvidia.com"), sparklineData: generateSparkline(892, 15), sector: "Technology" },
  { id: "h7", symbol: "META", name: "Meta Platforms", quantity: 6, avgBuyPrice: 320.00, currentPrice: 510.20, logo: logo("meta.com"), sparklineData: generateSparkline(510, 7), sector: "Technology" },
  { id: "h8", symbol: "V", name: "Visa Inc", quantity: 18, avgBuyPrice: 260.00, currentPrice: 285.30, logo: logo("visa.com"), sparklineData: generateSparkline(285, 2), sector: "Financial" },
]

export const watchlistItems: WatchlistItem[] = [
  { id: "w1", symbol: "NFLX", name: "Netflix", currentPrice: 682.40, dayChange: 1.24, logo: logo("netflix.com"), sparklineData: generateSparkline(682, 8) },
  { id: "w2", symbol: "AMD", name: "AMD", currentPrice: 164.80, dayChange: -0.87, logo: logo("amd.com"), sparklineData: generateSparkline(164, 4) },
  { id: "w3", symbol: "CRM", name: "Salesforce", currentPrice: 272.50, dayChange: 0.56, logo: logo("salesforce.com"), sparklineData: generateSparkline(272, 3) },
  { id: "w4", symbol: "PYPL", name: "PayPal", currentPrice: 68.90, dayChange: -1.32, logo: logo("paypal.com"), sparklineData: generateSparkline(68, 2) },
  { id: "w5", symbol: "SQ", name: "Block Inc", currentPrice: 78.20, dayChange: 2.15, logo: logo("block.xyz"), sparklineData: generateSparkline(78, 3) },
]

export const portfolioHistory: PortfolioHistoryPoint[] = [
  { date: "May 2025", portfolio: 42000, sp500: 44000 },
  { date: "Jun 2025", portfolio: 44500, sp500: 45200 },
  { date: "Jul 2025", portfolio: 43800, sp500: 44800 },
  { date: "Aug 2025", portfolio: 46200, sp500: 46100 },
  { date: "Sep 2025", portfolio: 48100, sp500: 47300 },
  { date: "Oct 2025", portfolio: 47500, sp500: 46800 },
  { date: "Nov 2025", portfolio: 51200, sp500: 48900 },
  { date: "Dec 2025", portfolio: 53800, sp500: 50200 },
  { date: "Jan 2026", portfolio: 52400, sp500: 49800 },
  { date: "Feb 2026", portfolio: 55100, sp500: 51400 },
  { date: "Mar 2026", portfolio: 58200, sp500: 53100 },
  { date: "Apr 2026", portfolio: 61450, sp500: 54800 },
]

// ══════════════════════════════════════════════════════════════════════════════
// WIDGET DATA: Financial Health Score (static)
// ══════════════════════════════════════════════════════════════════════════════

export const financialHealthScore = {
  overall: 78,
  trend: "up" as const,
  trendDelta: 3,
  factors: [
    { id: "hf1", label: "Savings Rate", score: 85, maxScore: 100, status: "excellent" as const, description: "You save 28% of your income — well above the 20% target" },
    { id: "hf2", label: "Spending Habits", score: 72, maxScore: 100, status: "good" as const, description: "Mostly within budget. Dining out is slightly over." },
    { id: "hf3", label: "Debt Ratio", score: 90, maxScore: 100, status: "excellent" as const, description: "Debt-to-income ratio of 8% — very healthy" },
    { id: "hf4", label: "Investment Growth", score: 68, maxScore: 100, status: "good" as const, description: "Portfolio up 12.4% YTD. Diversification is solid." },
    { id: "hf5", label: "Emergency Fund", score: 55, maxScore: 100, status: "fair" as const, description: "3.2 months of expenses covered — aim for 6 months" },
    { id: "hf6", label: "Bill Payments", score: 95, maxScore: 100, status: "excellent" as const, description: "All bills paid on time for 12 consecutive months" },
  ] as HealthFactor[],
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE DATA: Crypto (static)
// ══════════════════════════════════════════════════════════════════════════════

export const cryptoCoins: CryptoCoin[] = [
  {
    id: "btc",
    symbol: "BTC",
    name: "Bitcoin",
    logo: "/logos/bitcoin-com.png",
    price: 68420.50,
    change24h: 2.34,
    change7d: 5.12,
    marketCap: 1340000000000,
    volume24h: 28500000000,
    holdings: 1.24,
    sparklineData: [64200, 65100, 63800, 66500, 67200, 65800, 68100, 67500, 68900, 67800, 68420, 69100, 68200, 68420],
  },
  {
    id: "eth",
    symbol: "ETH",
    name: "Ethereum",
    logo: "/logos/ethereum-org.png",
    price: 3845.20,
    change24h: -1.15,
    change7d: 3.28,
    marketCap: 462000000000,
    volume24h: 15200000000,
    holdings: 12.5,
    sparklineData: [3720, 3680, 3750, 3810, 3790, 3850, 3820, 3780, 3860, 3830, 3845, 3870, 3810, 3845],
  },
  {
    id: "sol",
    symbol: "SOL",
    name: "Solana",
    logo: "/logos/solana-com.png",
    price: 178.90,
    change24h: 4.56,
    change7d: 12.3,
    marketCap: 82000000000,
    volume24h: 3800000000,
    holdings: 45,
    sparklineData: [152, 158, 155, 163, 168, 165, 172, 170, 175, 173, 178, 180, 176, 178],
  },
  {
    id: "bnb",
    symbol: "BNB",
    name: "BNB",
    logo: "/logos/bnbchain-org.png",
    price: 612.30,
    change24h: 0.87,
    change7d: -1.45,
    marketCap: 91000000000,
    volume24h: 1200000000,
    holdings: 8.2,
    sparklineData: [620, 615, 618, 610, 608, 612, 615, 610, 614, 611, 612, 615, 610, 612],
  },
  {
    id: "xrp",
    symbol: "XRP",
    name: "XRP",
    logo: "/logos/ripple-com.png",
    price: 0.6234,
    change24h: -2.10,
    change7d: -4.32,
    marketCap: 34000000000,
    volume24h: 1500000000,
    holdings: 5000,
    sparklineData: [0.65, 0.64, 0.66, 0.63, 0.62, 0.64, 0.63, 0.61, 0.62, 0.63, 0.62, 0.64, 0.63, 0.62],
  },
  {
    id: "ada",
    symbol: "ADA",
    name: "Cardano",
    logo: "/logos/cardano-org.png",
    price: 0.4521,
    change24h: 1.23,
    change7d: 6.78,
    marketCap: 16000000000,
    volume24h: 420000000,
    holdings: 10000,
    sparklineData: [0.41, 0.42, 0.43, 0.42, 0.44, 0.43, 0.45, 0.44, 0.45, 0.44, 0.45, 0.46, 0.45, 0.45],
  },
  {
    id: "doge",
    symbol: "DOGE",
    name: "Dogecoin",
    logo: "/logos/dogecoin-com.png",
    price: 0.1245,
    change24h: 8.92,
    change7d: 15.4,
    marketCap: 18000000000,
    volume24h: 2100000000,
    holdings: 25000,
    sparklineData: [0.105, 0.108, 0.110, 0.112, 0.115, 0.118, 0.120, 0.118, 0.122, 0.120, 0.124, 0.126, 0.123, 0.124],
  },
  {
    id: "avax",
    symbol: "AVAX",
    name: "Avalanche",
    logo: "/logos/avax-network.png",
    price: 38.75,
    change24h: -0.54,
    change7d: 2.15,
    marketCap: 15000000000,
    volume24h: 560000000,
    holdings: 120,
    sparklineData: [37.2, 37.8, 38.1, 37.5, 38.0, 38.4, 37.9, 38.2, 38.6, 38.3, 38.7, 39.0, 38.5, 38.7],
  },
]

// ══════════════════════════════════════════════════════════════════════════════
// PAGE DATA: Help & Support (static)
// ══════════════════════════════════════════════════════════════════════════════

export const faqItems: FaqItem[] = [
  { id: "faq1", category: "account", question: "How do I link a new bank account?", answer: "Go to the Accounts page, click \"Link New Account\", and follow the secure verification steps. We use 256-bit encryption and never store your bank credentials directly." },
  { id: "faq2", category: "payments", question: "How long do transfers take to process?", answer: "Domestic transfers typically complete within 1-2 business days. International transfers take 3-5 business days depending on the destination country and currency." },
  { id: "faq3", category: "security", question: "How do I enable two-factor authentication?", answer: "Navigate to Settings > Security, and toggle the Two-Factor Authentication switch. You can use an authenticator app or SMS verification. We recommend using an authenticator app for better security." },
  { id: "faq4", category: "billing", question: "What's included in Vault Pro?", answer: "Vault Pro includes unlimited bank connections, advanced analytics & AI insights, unlimited virtual cards, priority support, custom budget categories, and export to CSV & PDF. It's ₱12/month." },
  { id: "faq5", category: "account", question: "Can I have multiple currency accounts?", answer: "Yes! You can hold accounts in multiple currencies including PHP, USD, EUR, and more. Currency conversion happens at mid-market rates with a small transparent fee." },
  { id: "faq6", category: "security", question: "What happens if I notice suspicious activity?", answer: "Immediately freeze your cards from the Cards page, change your password in Settings > Security, and contact our support team. We have a dedicated fraud team that operates 24/7." },
  { id: "faq7", category: "payments", question: "Is there a limit on transfers?", answer: "Free accounts can transfer up to ₱5,000/day and ₱25,000/month. Pro accounts have limits of ₱25,000/day and ₱100,000/month. Contact support for higher limits." },
  { id: "faq8", category: "general", question: "How do I export my transaction history?", answer: "Go to the Transactions page, select the transactions you want to export using the checkboxes, then click the \"Export CSV\" button in the floating action bar." },
  { id: "faq9", category: "billing", question: "Can I cancel my Pro subscription anytime?", answer: "Yes, you can cancel at any time from Settings > Billing. Your Pro features will remain active until the end of your current billing period." },
  { id: "faq10", category: "general", question: "Does Vault support cryptocurrency trading?", answer: "Yes! The Crypto section supports buying, selling, swapping, and tracking major cryptocurrencies including BTC, ETH, SOL, and more. Real-time price tracking updates every 3 seconds." },
]

export const supportTickets: SupportTicket[] = [
  { id: "tk1", subject: "Transfer stuck in pending", status: "in-progress", priority: "high", createdAt: "Apr 10, 2026", lastUpdate: "Apr 12, 2026" },
  { id: "tk2", subject: "Request higher transfer limit", status: "open", priority: "medium", createdAt: "Apr 08, 2026", lastUpdate: "Apr 08, 2026" },
  { id: "tk3", subject: "Tax document request", status: "resolved", priority: "low", createdAt: "Mar 15, 2026", lastUpdate: "Mar 18, 2026" },
]

export const systemStatus = [
  { name: "Core Banking", status: "operational" as const },
  { name: "Card Payments", status: "operational" as const },
  { name: "Crypto Trading", status: "degraded" as const },
  { name: "International Transfers", status: "operational" as const },
  { name: "Mobile App", status: "operational" as const },
]
