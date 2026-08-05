// ---------------------------------------------------------------------------
// Card-issuing rules for the PH institution registry (@/lib/ph-institutions).
// Kept as its own module — rather than folded into ph-institutions.ts — so
// the ~30 deposit-account templates there don't need a card-specific field
// added to every entry. Plain data, no JSX and no @/server imports, so the
// client dialog, the API route validator, the mutation layer, and the DB
// seed can all import it without pulling in either the React tree or
// better-sqlite3.
// ---------------------------------------------------------------------------

import { getInstitution, type InstitutionTemplate } from "@/lib/ph-institutions"
import type { CardNetwork, CardProduct } from "@/lib/types"

export type { CardNetwork, CardProduct }

export type CardIssuerProfile = {
  networks: CardNetwork[]
  products: CardProduct[]
  cardTypes: ("physical" | "virtual")[]
  defaultNetwork: CardNetwork
  defaultProduct: CardProduct
  note?: string
}

// Baseline profile by institution kind (see InstitutionKind in @/lib/types).
// null means the institution doesn't issue cards at all — excluded from the
// issuer picker.
const PROFILE_BY_KIND: Record<InstitutionTemplate["kind"], CardIssuerProfile | null> = {
  universal: {
    networks: ["visa", "mastercard"],
    products: ["debit", "credit"],
    cardTypes: ["physical", "virtual"],
    defaultNetwork: "visa",
    defaultProduct: "debit",
  },
  commercial: {
    networks: ["visa", "mastercard"],
    products: ["debit", "credit"],
    cardTypes: ["physical", "virtual"],
    defaultNetwork: "visa",
    defaultProduct: "debit",
  },
  thrift: {
    networks: ["visa", "mastercard"],
    products: ["debit", "credit"],
    cardTypes: ["physical", "virtual"],
    defaultNetwork: "visa",
    defaultProduct: "debit",
  },
  rural: {
    networks: ["mastercard"],
    products: ["debit"],
    cardTypes: ["physical"],
    defaultNetwork: "mastercard",
    defaultProduct: "debit",
    note: "Rural banks typically issue physical debit cards only.",
  },
  digital: {
    networks: ["visa", "mastercard"],
    products: ["debit", "prepaid"],
    cardTypes: ["physical", "virtual"],
    defaultNetwork: "mastercard",
    defaultProduct: "debit",
  },
  ewallet: {
    networks: ["mastercard"],
    products: ["prepaid"],
    cardTypes: ["virtual"],
    defaultNetwork: "mastercard",
    defaultProduct: "prepaid",
    note: "E-wallets issue virtual prepaid cards only — no physical card, no credit line.",
  },
  broker: null,
  crypto: null,
}

// Per-institution tweaks layered on top of the kind baseline, for cases
// where the general rule doesn't hold.
const PROFILE_OVERRIDES: Record<string, Partial<CardIssuerProfile>> = {
  gcash: {
    note: "GCash issues the GCash Mastercard — a virtual prepaid card, physical on request.",
    cardTypes: ["virtual", "physical"],
  },
  "maya-wallet": {
    note: "Maya issues a virtual Maya Card by default; a physical card can be requested in-app.",
    cardTypes: ["virtual", "physical"],
  },
  "maya-bank": {
    products: ["debit", "prepaid"],
    cardTypes: ["physical", "virtual"],
  },
  banko: {
    products: ["debit"],
  },
  tonik: {
    products: ["debit"],
  },
  "card-bank": {
    products: ["debit"],
    cardTypes: ["physical"],
  },
}

export const CUSTOM_ISSUER_PROFILE: CardIssuerProfile = {
  networks: ["visa", "mastercard"],
  products: ["debit", "credit", "prepaid"],
  cardTypes: ["physical", "virtual"],
  defaultNetwork: "visa",
  defaultProduct: "debit",
}

function mergeProfile(base: CardIssuerProfile, override?: Partial<CardIssuerProfile>): CardIssuerProfile {
  if (!override) return base
  const merged = { ...base, ...override }
  if (!merged.networks.includes(merged.defaultNetwork)) merged.defaultNetwork = merged.networks[0]
  if (!merged.products.includes(merged.defaultProduct)) merged.defaultProduct = merged.products[0]
  return merged
}

/** Card-issuing profile for a PH institution template, or null if it doesn't issue cards. */
export function getCardIssuerProfile(templateId: string | null | undefined): CardIssuerProfile | null {
  const template = getInstitution(templateId)
  if (!template) return null
  const base = PROFILE_BY_KIND[template.kind]
  if (!base) return null
  return mergeProfile(base, PROFILE_OVERRIDES[template.id])
}

export function issuesCards(template: InstitutionTemplate): boolean {
  return PROFILE_BY_KIND[template.kind] !== null
}

export const DEFAULT_LIMITS: Record<CardProduct, { daily: number; monthly: number }> = {
  debit: { daily: 5000, monthly: 20000 },
  credit: { daily: 10000, monthly: 50000 },
  prepaid: { daily: 1000, monthly: 3000 },
}

export type CardColor = { id: string; label: string; className: string }

export const CARD_COLORS: CardColor[] = [
  { id: "primary", label: "Primary", className: "bg-primary text-primary-foreground" },
  { id: "secondary", label: "Secondary", className: "bg-secondary text-secondary-foreground" },
  { id: "muted", label: "Slate", className: "bg-muted text-foreground" },
  { id: "outline", label: "Outline", className: "bg-card text-card-foreground ring-1 ring-border" },
  { id: "emerald", label: "Emerald", className: "bg-emerald-600 text-white" },
  { id: "violet", label: "Violet", className: "bg-violet-600 text-white" },
]

// Accepts either a curated swatch from CARD_COLORS, or an institution's own
// brand color carried over from @/lib/ph-institutions (e.g. BPI's
// "bg-red-600") when the user issues a card straight from a linked account
// or bank template without touching the color picker — those aren't in the
// curated list, but are still just Tailwind utility classes, so a
// character/length whitelist is enough to keep this from being an open
// string field while still accepting them.
const SAFE_CLASS_PATTERN = /^[a-zA-Z0-9\-\s/]{1,120}$/

export function isValidCardColor(className: string | undefined | null): boolean {
  if (!className) return false
  if (CARD_COLORS.some((c) => c.className === className)) return true
  return SAFE_CLASS_PATTERN.test(className)
}

export const CARD_PRODUCT_LABELS: Record<CardProduct, string> = {
  debit: "Debit",
  credit: "Credit",
  prepaid: "Prepaid",
}

export const CARD_TYPE_LABELS: Record<"physical" | "virtual", string> = {
  physical: "Physical",
  virtual: "Virtual",
}

export const NETWORK_LABELS: Record<CardNetwork, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
}

// Shared between the client dialog (add-card-dialog.tsx) and the server
// mutation (@/server/mutations/cards createCard) — declared here, once, so
// the two can't drift, and so the client form never needs to import the
// server mutation module (which pulls in better-sqlite3) just for a type.
export type NewCardInput = {
  /** Funding account, when the card was issued from a linked account. */
  accountId: string | null
  /** PH institution template id, or null for the "custom issuer" path. */
  issuerTemplateId: string | null
  issuer: string
  name: string
  type: "physical" | "virtual"
  product: CardProduct
  network: CardNetwork
  holder: string
  dailyLimit?: number
  monthlyLimit?: number
  color?: string
}
