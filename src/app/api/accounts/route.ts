import { getAccounts } from "@/server/queries/accounts"
import { createAccount } from "@/server/mutations/accounts"

export async function GET() {
  const accounts = await getAccounts()
  return Response.json(accounts)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { institution, type, accountNumber } = body ?? {}
  if (
    typeof institution !== "string" ||
    !institution.trim() ||
    typeof accountNumber !== "string" ||
    !accountNumber.trim() ||
    !["checking", "savings", "crypto", "investment"].includes(type)
  ) {
    return Response.json(
      { error: "institution, type, and accountNumber are required" },
      { status: 400 }
    )
  }
  const account = await createAccount({ institution: institution.trim(), type, accountNumber })
  return Response.json(account, { status: 201 })
}
