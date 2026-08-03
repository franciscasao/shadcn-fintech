import { getAccounts } from "@/server/queries/accounts"
import { createAccount, type NewAccountInput } from "@/server/mutations/accounts"
import { getInstitution } from "@/lib/ph-institutions"

const ACCOUNT_TYPES = ["checking", "savings", "crypto", "investment"] as const
const CREDITING_FREQUENCIES = ["daily", "monthly", "quarterly", "maturity", "none"] as const
const CREDITING_TIMINGS = ["start_of_day", "end_of_day", "month_end", "maturity"] as const

export async function GET() {
  const accounts = await getAccounts()
  return Response.json(accounts)
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

export async function POST(request: Request) {
  const body = await request.json()
  const {
    templateId,
    institution,
    type,
    accountNumber,
    nickname,
    balance,
    pdicInsured,
    interestRate,
    creditingFrequency,
    creditingTiming,
    compounding,
    maintainingBalance,
    requiredAdb,
    interestCap,
    monthlyFee,
    freeTransfersPerMonth,
    instapayFee,
    pesonetFee,
    dailyTransferLimit,
  } = body ?? {}

  if (typeof institution !== "string" || !institution.trim()) {
    return badRequest("institution is required")
  }
  if (typeof accountNumber !== "string" || !accountNumber.trim()) {
    return badRequest("accountNumber is required")
  }
  if (!ACCOUNT_TYPES.includes(type)) {
    return badRequest("type must be one of checking, savings, crypto, investment")
  }

  let resolvedTemplateId: string | null = null
  if (templateId !== undefined && templateId !== null) {
    if (typeof templateId !== "string") return badRequest("templateId must be a string or null")
    const template = getInstitution(templateId)
    if (!template) return badRequest(`unknown templateId: ${templateId}`)
    if (!template.allowedTypes.includes(type)) {
      return badRequest(`${template.name} does not support account type "${type}"`)
    }
    resolvedTemplateId = templateId
  }

  if (nickname !== undefined && typeof nickname !== "string") {
    return badRequest("nickname must be a string")
  }
  if (!isValidOptionalNumber(balance)) return badRequest("balance must be a non-negative number")
  if (pdicInsured !== undefined && typeof pdicInsured !== "boolean") {
    return badRequest("pdicInsured must be a boolean")
  }
  if (compounding !== undefined && typeof compounding !== "boolean") {
    return badRequest("compounding must be a boolean")
  }
  if (!isValidOptionalNumber(interestRate, { max: 100 })) {
    return badRequest("interestRate must be a number between 0 and 100")
  }
  if (creditingFrequency !== undefined && !CREDITING_FREQUENCIES.includes(creditingFrequency)) {
    return badRequest("creditingFrequency is invalid")
  }
  if (
    creditingTiming !== undefined &&
    creditingTiming !== null &&
    !CREDITING_TIMINGS.includes(creditingTiming)
  ) {
    return badRequest("creditingTiming is invalid")
  }
  for (const [key, value] of Object.entries({
    maintainingBalance,
    requiredAdb,
    interestCap,
    monthlyFee,
    freeTransfersPerMonth,
    instapayFee,
    pesonetFee,
    dailyTransferLimit,
  })) {
    if (!isValidOptionalNumber(value)) return badRequest(`${key} must be a non-negative number`)
  }

  const input: NewAccountInput = {
    templateId: resolvedTemplateId,
    institution: institution.trim(),
    type,
    accountNumber,
    nickname: nickname?.trim(),
    balance,
    pdicInsured,
    interestRate,
    creditingFrequency,
    creditingTiming,
    compounding,
    maintainingBalance,
    requiredAdb,
    interestCap,
    monthlyFee,
    freeTransfersPerMonth,
    instapayFee,
    pesonetFee,
    dailyTransferLimit,
  }

  const account = await createAccount(input)
  return Response.json(account, { status: 201 })
}
