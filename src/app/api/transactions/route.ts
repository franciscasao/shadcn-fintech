import { getTransactions } from "@/server/queries/transactions"

export async function GET() {
  const transactions = await getTransactions()
  return Response.json(transactions)
}
