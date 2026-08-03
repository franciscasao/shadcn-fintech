import { getSavingsGoals } from "@/server/queries/budgets"
import { createSavingsGoal } from "@/server/mutations/budgets"

export async function GET() {
  const goals = await getSavingsGoals()
  return Response.json(goals)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { name, targetAmount, deadline, iconName, monthlyContribution } = body ?? {}
  if (
    typeof name !== "string" ||
    !name.trim() ||
    !Number.isFinite(Number(targetAmount)) ||
    typeof deadline !== "string" ||
    !deadline.trim() ||
    typeof iconName !== "string" ||
    !iconName.trim() ||
    !Number.isFinite(Number(monthlyContribution))
  ) {
    return Response.json(
      { error: "name, targetAmount, deadline, iconName, and monthlyContribution are required" },
      { status: 400 }
    )
  }
  await createSavingsGoal({
    name: name.trim(),
    targetAmount: Number(targetAmount),
    deadline: deadline.trim(),
    iconName: iconName.trim(),
    monthlyContribution: Number(monthlyContribution),
  })
  return new Response(null, { status: 201 })
}
