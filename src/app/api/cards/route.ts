import { getCards } from "@/server/queries/cards"
import { createCard, type NewCardInput } from "@/server/mutations/cards"
import { getInstitution } from "@/lib/ph-institutions"
import { getCardIssuerProfile, CUSTOM_ISSUER_PROFILE, isValidCardColor } from "@/lib/ph-cards"

const CARD_TYPES = ["physical", "virtual"] as const
const CARD_PRODUCTS = ["debit", "credit", "prepaid"] as const
const CARD_NETWORKS = ["visa", "mastercard"] as const

export async function GET() {
  const cards = await getCards()
  return Response.json(cards)
}

function badRequest(error: string) {
  return Response.json({ error }, { status: 400 })
}

// Optional numeric field: must be a finite number (or omitted/null) — never
// NaN/Infinity/a string, since these flow straight into `real` DB columns.
function isValidOptionalNumber(value: unknown, { max }: { max?: number } = {}) {
  if (value === undefined || value === null) return true
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && (max === undefined || value <= max)
}

// Optional 1-31 "day of month" field (statementDay / dueDay) — clamped to a
// real calendar day; see clampToMonth in @/lib/credit for how a value like
// 31 resolves in a shorter month.
function isValidOptionalDayOfMonth(value: unknown) {
  if (value === undefined || value === null) return true
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 31
}

export async function POST(request: Request) {
  const body = await request.json()
  const {
    name,
    holder,
    accountId,
    issuerTemplateId,
    issuer,
    type,
    product,
    network,
    dailyLimit,
    monthlyLimit,
    color,
    creditLimit,
    apr,
    statementDay,
    dueDay,
  } = body ?? {}

  if (typeof name !== "string" || !name.trim()) {
    return badRequest("name is required")
  }
  if (typeof holder !== "string" || !holder.trim()) {
    return badRequest("holder is required")
  }

  let resolvedTemplateId: string | null = null
  if (issuerTemplateId !== undefined && issuerTemplateId !== null) {
    if (typeof issuerTemplateId !== "string") {
      return badRequest("issuerTemplateId must be a string or null")
    }
    const template = getInstitution(issuerTemplateId)
    if (!template) return badRequest(`unknown issuerTemplateId: ${issuerTemplateId}`)
    resolvedTemplateId = issuerTemplateId
  }
  if (resolvedTemplateId === null && (typeof issuer !== "string" || !issuer.trim())) {
    return badRequest("issuer is required when issuerTemplateId is not set")
  }

  const profile = resolvedTemplateId
    ? getCardIssuerProfile(resolvedTemplateId)
    : CUSTOM_ISSUER_PROFILE
  if (!profile) {
    return badRequest(`${issuer ?? resolvedTemplateId} does not issue cards`)
  }

  if (!CARD_TYPES.includes(type)) {
    return badRequest("type must be one of physical, virtual")
  }
  if (!profile.cardTypes.includes(type)) {
    return badRequest(`this issuer does not offer ${type} cards`)
  }
  if (!CARD_PRODUCTS.includes(product)) {
    return badRequest("product must be one of debit, credit, prepaid")
  }
  if (!profile.products.includes(product)) {
    return badRequest(`this issuer does not offer ${product} cards`)
  }
  if (!CARD_NETWORKS.includes(network)) {
    return badRequest("network must be one of visa, mastercard")
  }
  if (!profile.networks.includes(network)) {
    return badRequest(`this issuer does not offer ${network} cards`)
  }

  let resolvedAccountId: string | null = null
  if (accountId !== undefined && accountId !== null && accountId !== "") {
    const parsed = Number(accountId)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return badRequest("accountId must be a positive integer")
    }
    resolvedAccountId = String(parsed)
  }

  if (!isValidOptionalNumber(dailyLimit, { max: 10000 })) {
    return badRequest("dailyLimit must be a number between 0 and 10000")
  }
  if (!isValidOptionalNumber(monthlyLimit)) {
    return badRequest("monthlyLimit must be a non-negative number")
  }
  if (color !== undefined && color !== null && !isValidCardColor(color)) {
    return badRequest("color is not a recognized card color")
  }
  if (!isValidOptionalNumber(creditLimit)) {
    return badRequest("creditLimit must be a non-negative number")
  }
  if (!isValidOptionalNumber(apr, { max: 100 })) {
    return badRequest("apr must be a number between 0 and 100")
  }
  if (!isValidOptionalDayOfMonth(statementDay)) {
    return badRequest("statementDay must be an integer between 1 and 31")
  }
  if (!isValidOptionalDayOfMonth(dueDay)) {
    return badRequest("dueDay must be an integer between 1 and 31")
  }

  const input: NewCardInput = {
    accountId: resolvedAccountId,
    issuerTemplateId: resolvedTemplateId,
    issuer: resolvedTemplateId ? "" : String(issuer).trim(),
    name: name.trim(),
    type,
    product,
    network,
    holder: holder.trim(),
    dailyLimit: dailyLimit ?? undefined,
    monthlyLimit: monthlyLimit ?? undefined,
    color: color ?? undefined,
    creditLimit: creditLimit ?? undefined,
    apr: apr ?? undefined,
    statementDay: statementDay ?? undefined,
    dueDay: dueDay ?? undefined,
  }

  const card = await createCard(input)
  return Response.json(card, { status: 201 })
}
