// ---------------------------------------------------------------------------
// Registry of Philippine banks, digital banks, e-wallets, and brokers used to
// power the "link an account" institution picker. Plain data, no JSX and no
// @/server imports, so it can be shared by the client picker, the API route
// validator, the account mutation layer, and the DB seed fixtures without
// pulling either the React tree or better-sqlite3 into the wrong bundle.
//
// Rates, maintaining balances, and fees are published headline figures for
// illustration — they are prefilled defaults a user can edit, not live data.
// ---------------------------------------------------------------------------

import { logo } from "@/lib/media"
import type { BankAccount, CreditingFrequency, CreditingTiming, InstitutionKind } from "@/lib/types"

export const RATES_AS_OF = "August 2026"

export type { CreditingFrequency, CreditingTiming, InstitutionKind }

export type InstitutionGroupId =
  | "digital"
  | "universal"
  | "ewallet"
  | "thrift-rural"
  | "broker-crypto"

export type InstitutionTemplate = {
  id: string
  name: string
  logo: string
  kind: InstitutionKind
  group: InstitutionGroupId
  color: string
  defaultType: BankAccount["type"]
  allowedTypes: BankAccount["type"][]
  // regulatory
  pdicInsured: boolean
  // interest
  interestRate?: number
  creditingFrequency: CreditingFrequency
  creditingTiming?: CreditingTiming
  compounding: boolean
  // balance rules
  maintainingBalance?: number
  requiredAdb?: number
  interestCap?: number
  // fees & limits
  monthlyFee?: number
  freeTransfersPerMonth?: number
  instapayFee?: number
  pesonetFee?: number
  dailyTransferLimit?: number
  note?: string
}

export const INSTITUTION_GROUPS: { id: InstitutionGroupId; label: string }[] = [
  { id: "digital", label: "Digital Banks" },
  { id: "universal", label: "Universal & Commercial Banks" },
  { id: "ewallet", label: "E-Wallets" },
  { id: "thrift-rural", label: "Thrift, Rural & Co-op Banks" },
  { id: "broker-crypto", label: "Brokers & Crypto" },
]

// Shared between the client dialog (add-account-dialog.tsx) and the server
// mutation (@/server/mutations/accounts createAccount). Declared here, once,
// so the two can't drift the way the old NewAccountInput did — and so the
// client form never needs to import the server mutation module (which pulls
// in better-sqlite3) just for a type.
export type NewAccountInput = {
  templateId: string | null
  institution: string
  type: BankAccount["type"]
  accountNumber: string
  nickname?: string
  balance?: number
  pdicInsured?: boolean
  interestRate?: number | null
  creditingFrequency?: CreditingFrequency
  creditingTiming?: CreditingTiming | null
  compounding?: boolean
  maintainingBalance?: number | null
  requiredAdb?: number | null
  interestCap?: number | null
  monthlyFee?: number | null
  freeTransfersPerMonth?: number | null
  instapayFee?: number | null
  pesonetFee?: number | null
  dailyTransferLimit?: number | null
}

export const PH_INSTITUTIONS: InstitutionTemplate[] = [
  // ── Digital banks ──────────────────────────────────────────────────────
  {
    id: "maya-bank",
    name: "Maya Bank",
    logo: logo("maya.ph"),
    kind: "digital",
    group: "digital",
    color: "bg-emerald-500",
    defaultType: "savings",
    allowedTypes: ["savings", "checking"],
    pdicInsured: true,
    interestRate: 3.5,
    creditingFrequency: "daily",
    creditingTiming: "end_of_day",
    compounding: true,
    interestCap: 100000,
    note: "Interest is credited daily at end of day. Base rate shown — promos can push the effective yield higher on balances up to ₱100,000.",
  },
  {
    id: "seabank-ph",
    name: "SeaBank Philippines",
    logo: logo("seabank.ph"),
    kind: "digital",
    group: "digital",
    color: "bg-orange-500",
    defaultType: "savings",
    allowedTypes: ["savings", "checking"],
    pdicInsured: true,
    interestRate: 3.25,
    creditingFrequency: "daily",
    creditingTiming: "start_of_day",
    compounding: true,
    interestCap: 1000000,
    note: "Interest is credited daily at start of day — 3.25% p.a. up to ₱1,000,000, 3.75% p.a. on the excess.",
  },
  {
    id: "gotyme-bank",
    name: "GoTyme Bank",
    logo: logo("gotyme.com.ph"),
    kind: "digital",
    group: "digital",
    color: "bg-cyan-500",
    defaultType: "savings",
    allowedTypes: ["savings", "checking"],
    pdicInsured: true,
    interestRate: 3.0,
    creditingFrequency: "daily",
    creditingTiming: "end_of_day",
    compounding: true,
    note: "Flat rate, no minimum balance or conditions.",
  },
  {
    id: "tonik-bank",
    name: "Tonik Bank",
    logo: "/logos/tonikbank-com.svg",
    kind: "digital",
    group: "digital",
    color: "bg-lime-500",
    defaultType: "savings",
    allowedTypes: ["savings", "checking"],
    pdicInsured: true,
    interestRate: 4.5,
    creditingFrequency: "monthly",
    creditingTiming: "month_end",
    compounding: true,
    note: "Stash savings rate shown. Tonik time deposits (6–24 months) earn up to 8% p.a. separately.",
  },
  {
    id: "uno-digital-bank",
    name: "UnionDigital Bank (UNO)",
    logo: "/logos/unobank-ph.svg",
    kind: "digital",
    group: "digital",
    color: "bg-pink-500",
    defaultType: "savings",
    allowedTypes: ["savings", "checking"],
    pdicInsured: true,
    interestRate: 3.0,
    creditingFrequency: "daily",
    creditingTiming: "end_of_day",
    compounding: true,
    requiredAdb: 5000,
    note: "3.0% p.a. base, rising to 3.5% once your average daily balance reaches ₱5,000.",
  },
  {
    id: "ofbank",
    name: "Overseas Filipino Bank (OFBank)",
    logo: logo("ofbank.com.ph"),
    kind: "digital",
    group: "digital",
    color: "bg-blue-600",
    defaultType: "savings",
    allowedTypes: ["savings", "checking"],
    pdicInsured: true,
    interestRate: 2.5,
    creditingFrequency: "monthly",
    creditingTiming: "month_end",
    compounding: false,
    note: "Government-owned digital bank for OFWs and their families.",
  },

  // ── Universal & commercial banks ─────────────────────────────────────────
  {
    id: "bpi",
    name: "Bank of the Philippine Islands (BPI)",
    logo: logo("bpi.com.ph"),
    kind: "universal",
    group: "universal",
    color: "bg-red-600",
    defaultType: "checking",
    allowedTypes: ["checking", "savings"],
    pdicInsured: true,
    interestRate: 0.25,
    creditingFrequency: "quarterly",
    creditingTiming: "month_end",
    compounding: false,
    maintainingBalance: 3000,
    instapayFee: 0,
    pesonetFee: 0,
    dailyTransferLimit: 50000,
  },
  {
    id: "bdo",
    name: "BDO Unibank",
    logo: logo("bdo.com.ph"),
    kind: "universal",
    group: "universal",
    color: "bg-blue-700",
    defaultType: "checking",
    allowedTypes: ["checking", "savings"],
    pdicInsured: true,
    interestRate: 0.25,
    creditingFrequency: "quarterly",
    creditingTiming: "month_end",
    compounding: false,
    maintainingBalance: 2000,
    instapayFee: 0,
    pesonetFee: 0,
    dailyTransferLimit: 50000,
  },
  {
    id: "metrobank",
    name: "Metrobank",
    logo: logo("metrobank.com.ph"),
    kind: "universal",
    group: "universal",
    color: "bg-blue-900",
    defaultType: "checking",
    allowedTypes: ["checking", "savings"],
    pdicInsured: true,
    interestRate: 0.25,
    creditingFrequency: "quarterly",
    creditingTiming: "month_end",
    compounding: false,
    maintainingBalance: 2000,
    instapayFee: 0,
    pesonetFee: 0,
    dailyTransferLimit: 50000,
  },
  {
    id: "landbank",
    name: "Landbank of the Philippines",
    logo: logo("landbank.com"),
    kind: "universal",
    group: "universal",
    color: "bg-green-600",
    defaultType: "savings",
    allowedTypes: ["checking", "savings"],
    pdicInsured: true,
    interestRate: 0.25,
    creditingFrequency: "quarterly",
    creditingTiming: "month_end",
    compounding: false,
    maintainingBalance: 2000,
    instapayFee: 0,
    pesonetFee: 0,
    dailyTransferLimit: 50000,
    note: "Government-owned universal bank.",
  },
  {
    id: "unionbank",
    name: "UnionBank of the Philippines",
    logo: logo("unionbankph.com"),
    kind: "universal",
    group: "universal",
    color: "bg-orange-600",
    defaultType: "checking",
    allowedTypes: ["checking", "savings"],
    pdicInsured: true,
    interestRate: 0.25,
    creditingFrequency: "quarterly",
    creditingTiming: "month_end",
    compounding: false,
    maintainingBalance: 0,
    instapayFee: 0,
    pesonetFee: 0,
    dailyTransferLimit: 50000,
    note: "EON account — zero maintaining balance.",
  },
  {
    id: "security-bank",
    name: "Security Bank",
    logo: logo("securitybank.com"),
    kind: "universal",
    group: "universal",
    color: "bg-teal-600",
    defaultType: "checking",
    allowedTypes: ["checking", "savings"],
    pdicInsured: true,
    interestRate: 0.25,
    creditingFrequency: "quarterly",
    creditingTiming: "month_end",
    compounding: false,
    maintainingBalance: 2000,
    instapayFee: 0,
    pesonetFee: 0,
    dailyTransferLimit: 50000,
  },
  {
    id: "pnb",
    name: "Philippine National Bank (PNB)",
    logo: logo("pnb.com.ph"),
    kind: "universal",
    group: "universal",
    color: "bg-yellow-600",
    defaultType: "checking",
    allowedTypes: ["checking", "savings"],
    pdicInsured: true,
    interestRate: 0.25,
    creditingFrequency: "quarterly",
    creditingTiming: "month_end",
    compounding: false,
    maintainingBalance: 2000,
    instapayFee: 0,
    pesonetFee: 0,
    dailyTransferLimit: 50000,
  },
  {
    id: "rcbc",
    name: "Rizal Commercial Banking Corporation (RCBC)",
    logo: logo("rcbc.com"),
    kind: "commercial",
    group: "universal",
    color: "bg-sky-600",
    defaultType: "checking",
    allowedTypes: ["checking", "savings"],
    pdicInsured: true,
    interestRate: 0.25,
    creditingFrequency: "quarterly",
    creditingTiming: "month_end",
    compounding: false,
    maintainingBalance: 2000,
    instapayFee: 0,
    pesonetFee: 0,
    dailyTransferLimit: 50000,
  },
  {
    id: "china-bank",
    name: "China Banking Corporation (Chinabank)",
    logo: logo("chinabank.ph"),
    kind: "commercial",
    group: "universal",
    color: "bg-red-700",
    defaultType: "checking",
    allowedTypes: ["checking", "savings"],
    pdicInsured: true,
    interestRate: 0.25,
    creditingFrequency: "quarterly",
    creditingTiming: "month_end",
    compounding: false,
    maintainingBalance: 2000,
    instapayFee: 0,
    pesonetFee: 0,
    dailyTransferLimit: 50000,
  },
  {
    id: "eastwest-bank",
    name: "EastWest Bank",
    logo: logo("eastwestbanker.com"),
    kind: "commercial",
    group: "universal",
    color: "bg-purple-600",
    defaultType: "checking",
    allowedTypes: ["checking", "savings"],
    pdicInsured: true,
    interestRate: 0.25,
    creditingFrequency: "quarterly",
    creditingTiming: "month_end",
    compounding: false,
    maintainingBalance: 2000,
    instapayFee: 0,
    pesonetFee: 0,
    dailyTransferLimit: 50000,
  },
  {
    id: "dbp",
    name: "Development Bank of the Philippines (DBP)",
    logo: logo("dbp.ph"),
    kind: "universal",
    group: "universal",
    color: "bg-blue-800",
    defaultType: "savings",
    allowedTypes: ["checking", "savings"],
    pdicInsured: true,
    interestRate: 0.25,
    creditingFrequency: "quarterly",
    creditingTiming: "month_end",
    compounding: false,
    maintainingBalance: 2000,
    instapayFee: 0,
    pesonetFee: 0,
    dailyTransferLimit: 50000,
    note: "Government-owned development bank.",
  },
  {
    id: "maybank-ph",
    name: "Maybank Philippines",
    logo: logo("maybank.com.ph"),
    kind: "commercial",
    group: "universal",
    color: "bg-yellow-500",
    defaultType: "checking",
    allowedTypes: ["checking", "savings"],
    pdicInsured: true,
    interestRate: 0.25,
    creditingFrequency: "quarterly",
    creditingTiming: "month_end",
    compounding: false,
    maintainingBalance: 2000,
    instapayFee: 0,
    pesonetFee: 0,
    dailyTransferLimit: 50000,
  },

  // ── E-wallets (EMIs) ──────────────────────────────────────────────────────
  {
    id: "gcash",
    name: "GCash",
    logo: logo("gcash.com"),
    kind: "ewallet",
    group: "ewallet",
    color: "bg-blue-500",
    defaultType: "checking",
    allowedTypes: ["checking"],
    pdicInsured: false,
    creditingFrequency: "none",
    compounding: false,
    dailyTransferLimit: 50000,
    note: "E-money wallet (EMI) — the wallet balance itself is not a bank deposit and is not PDIC-insured.",
  },
  {
    id: "maya-wallet",
    name: "Maya Wallet",
    logo: logo("maya.ph"),
    kind: "ewallet",
    group: "ewallet",
    color: "bg-emerald-400",
    defaultType: "checking",
    allowedTypes: ["checking"],
    pdicInsured: false,
    creditingFrequency: "none",
    compounding: false,
    dailyTransferLimit: 50000,
    note: "E-money wallet — separate from the interest-bearing Maya Bank savings product.",
  },
  {
    id: "shopeepay",
    name: "ShopeePay",
    logo: logo("shopeepay.ph"),
    kind: "ewallet",
    group: "ewallet",
    color: "bg-orange-500",
    defaultType: "checking",
    allowedTypes: ["checking"],
    pdicInsured: false,
    creditingFrequency: "none",
    compounding: false,
    note: "E-money wallet (EMI) — not PDIC-insured.",
  },
  {
    id: "grabpay",
    name: "GrabPay",
    logo: logo("grab.com"),
    kind: "ewallet",
    group: "ewallet",
    color: "bg-green-500",
    defaultType: "checking",
    allowedTypes: ["checking"],
    pdicInsured: false,
    creditingFrequency: "none",
    compounding: false,
    note: "E-money wallet (EMI) — not PDIC-insured.",
  },
  {
    id: "gsave",
    name: "GSave (via GCash)",
    logo: logo("cimbbank.com.ph"),
    kind: "digital",
    group: "ewallet",
    color: "bg-indigo-600",
    defaultType: "savings",
    allowedTypes: ["savings"],
    pdicInsured: true,
    interestRate: 2.6,
    creditingFrequency: "daily",
    creditingTiming: "end_of_day",
    compounding: true,
    note: "GSave is a CIMB Bank Philippines savings account accessed through the GCash app — the balance sits in a separate, insured deposit account from your GCash wallet.",
  },

  // ── Thrift, rural & co-op banks ───────────────────────────────────────────
  {
    id: "psbank",
    name: "PSBank",
    logo: logo("psbank.com.ph"),
    kind: "thrift",
    group: "thrift-rural",
    color: "bg-blue-600",
    defaultType: "savings",
    allowedTypes: ["checking", "savings"],
    pdicInsured: true,
    interestRate: 0.25,
    creditingFrequency: "quarterly",
    creditingTiming: "month_end",
    compounding: false,
    maintainingBalance: 2000,
    instapayFee: 0,
    pesonetFee: 0,
    dailyTransferLimit: 50000,
  },
  {
    id: "robinsons-bank",
    name: "Robinsons Bank",
    logo: logo("robinsonsbank.com.ph"),
    kind: "thrift",
    group: "thrift-rural",
    color: "bg-red-500",
    defaultType: "savings",
    allowedTypes: ["checking", "savings"],
    pdicInsured: true,
    interestRate: 0.25,
    creditingFrequency: "quarterly",
    creditingTiming: "month_end",
    compounding: false,
    maintainingBalance: 2000,
    instapayFee: 0,
    pesonetFee: 0,
    dailyTransferLimit: 50000,
  },
  {
    id: "card-bank",
    name: "CARD Bank",
    logo: logo("cardbankph.com"),
    kind: "rural",
    group: "thrift-rural",
    color: "bg-yellow-600",
    defaultType: "savings",
    allowedTypes: ["savings"],
    pdicInsured: true,
    interestRate: 1.0,
    creditingFrequency: "monthly",
    creditingTiming: "month_end",
    compounding: false,
    note: "Microfinance-oriented rural bank.",
  },

  // ── Brokers & crypto ──────────────────────────────────────────────────────
  {
    id: "col-financial",
    name: "COL Financial",
    logo: logo("colfinancial.com"),
    kind: "broker",
    group: "broker-crypto",
    color: "bg-blue-700",
    defaultType: "investment",
    allowedTypes: ["investment"],
    pdicInsured: false,
    creditingFrequency: "none",
    compounding: false,
    note: "Stock brokerage — funds sit in a segregated cash management account, not a bank deposit.",
  },
  {
    id: "first-metro-sec",
    name: "First Metro Securities",
    logo: logo("firstmetrosec.com.ph"),
    kind: "broker",
    group: "broker-crypto",
    color: "bg-blue-900",
    defaultType: "investment",
    allowedTypes: ["investment"],
    pdicInsured: false,
    creditingFrequency: "none",
    compounding: false,
    note: "Stock brokerage — funds sit in a segregated cash management account, not a bank deposit.",
  },
  {
    id: "coins-ph",
    name: "Coins.ph",
    logo: logo("coins.ph"),
    kind: "crypto",
    group: "broker-crypto",
    color: "bg-blue-500",
    defaultType: "crypto",
    allowedTypes: ["crypto", "checking"],
    pdicInsured: false,
    creditingFrequency: "none",
    compounding: false,
    note: "Crypto & e-wallet — crypto holdings are not deposit-insured and fluctuate with the market.",
  },
  {
    id: "pdax",
    name: "PDAX",
    logo: logo("pdax.ph"),
    kind: "crypto",
    group: "broker-crypto",
    color: "bg-emerald-600",
    defaultType: "crypto",
    allowedTypes: ["crypto"],
    pdicInsured: false,
    creditingFrequency: "none",
    compounding: false,
    note: "Crypto exchange — holdings are not deposit-insured and fluctuate with the market.",
  },
]

export function getInstitution(id: string | null | undefined): InstitutionTemplate | undefined {
  if (!id) return undefined
  return PH_INSTITUTIONS.find((i) => i.id === id)
}
