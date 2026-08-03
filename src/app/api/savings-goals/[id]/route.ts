import { updateSavingsGoalProgress } from "@/server/mutations/budgets"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const numericId = Number(id)
  const body = await request.json()
  const currentAmount = Number(body?.currentAmount)
  if (!Number.isFinite(numericId) || !Number.isFinite(currentAmount) || currentAmount < 0) {
    return Response.json(
      { error: "currentAmount (non-negative number) is required" },
      { status: 400 }
    )
  }
  await updateSavingsGoalProgress(numericId, currentAmount)
  return new Response(null, { status: 204 })
}
