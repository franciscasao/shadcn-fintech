import { updateBudgetCategoryTarget } from "@/server/mutations/budgets"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const numericId = Number(id)
  const body = await request.json()
  const budget = Number(body?.budget)
  if (!Number.isFinite(numericId) || !Number.isFinite(budget) || budget < 0) {
    return Response.json({ error: "budget (non-negative number) is required" }, { status: 400 })
  }
  await updateBudgetCategoryTarget(numericId, budget)
  return new Response(null, { status: 204 })
}
