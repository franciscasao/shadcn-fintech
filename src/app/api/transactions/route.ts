import {
  clampPageSize,
  getTransactionsPage,
  type TransactionFilters,
} from "@/server/queries/transactions"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const filters: TransactionFilters = {
    search: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    type: searchParams.get("type") ?? undefined,
  }
  const page = Number(searchParams.get("page")) || 1
  const pageSize = clampPageSize(Number(searchParams.get("size")) || 25)

  const transactionsPage = await getTransactionsPage(filters, { page, pageSize })
  return Response.json(transactionsPage)
}
