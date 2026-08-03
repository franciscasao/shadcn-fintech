import { getBudgetCategories } from "@/server/queries/budgets"

export async function GET() {
  const categories = await getBudgetCategories()
  return Response.json(categories)
}
