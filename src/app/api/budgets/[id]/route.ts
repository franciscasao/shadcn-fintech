import { updateBudgetCategory, deleteBudgetCategory } from "@/server/mutations/budgets"
import { KNOWN_ICON_NAMES } from "@/server/icon-colors"

function badRequest(error: string) {
  return Response.json({ error }, { status: 400 })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const numericId = Number(id)
  if (!Number.isInteger(numericId)) return badRequest("invalid budget id")

  const body = await request.json()
  const { category, budget, iconName } = body ?? {}
  const numericBudget = Number(budget)

  if (
    typeof category !== "string" ||
    !category.trim() ||
    category.trim().length > 24 ||
    !Number.isFinite(numericBudget) ||
    numericBudget < 0 ||
    typeof iconName !== "string" ||
    !KNOWN_ICON_NAMES.includes(iconName)
  ) {
    return badRequest(
      "category (1-24 chars), budget (a non-negative number), and a known iconName are required"
    )
  }

  const result = await updateBudgetCategory(numericId, {
    category: category.trim(),
    budget: numericBudget,
    iconName,
  })
  if (result === "not_found") {
    return Response.json({ error: "budget not found" }, { status: 404 })
  }
  if (result === "duplicate") {
    return Response.json({ error: "A budget for that category already exists" }, { status: 409 })
  }
  return Response.json(result)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const numericId = Number(id)
  if (!Number.isInteger(numericId)) return badRequest("invalid budget id")

  const body = await request.json().catch(() => null)
  const rawReassignTo = body?.reassignTo
  let reassignTo: number | null = null
  if (rawReassignTo !== null && rawReassignTo !== undefined) {
    reassignTo = Number(rawReassignTo)
    if (!Number.isInteger(reassignTo)) {
      return badRequest("reassignTo, when provided, must be the id of another budget")
    }
  }

  const result = await deleteBudgetCategory(numericId, reassignTo)
  if (result === "not_found") {
    return Response.json({ error: "budget not found" }, { status: 404 })
  }
  return new Response(null, { status: 204 })
}
