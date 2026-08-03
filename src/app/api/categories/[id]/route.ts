import { getBudgetBuckets } from "@/server/queries/budgets"
import { updateCategory, deleteCategory } from "@/server/mutations/categories"
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
  if (!Number.isInteger(numericId)) return badRequest("invalid category id")

  const body = await request.json()
  const { name, iconName, budgetBucket } = body ?? {}

  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 24 ||
    typeof iconName !== "string" ||
    !KNOWN_ICON_NAMES.includes(iconName) ||
    (budgetBucket !== null && budgetBucket !== undefined && typeof budgetBucket !== "string")
  ) {
    return badRequest(
      "name (1-24 chars), a known iconName, and an optional budgetBucket are required"
    )
  }

  const buckets = await getBudgetBuckets()
  if (budgetBucket && !buckets.includes(budgetBucket)) {
    return badRequest("budgetBucket is not a known bucket")
  }

  const result = await updateCategory(numericId, {
    name: name.trim(),
    iconName,
    budgetBucket: budgetBucket ?? null,
  })
  if (result === "not_found") {
    return Response.json({ error: "category not found" }, { status: 404 })
  }
  if (result === "duplicate") {
    return Response.json({ error: "A category with that name already exists" }, { status: 409 })
  }
  return Response.json(result)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const numericId = Number(id)
  if (!Number.isInteger(numericId)) return badRequest("invalid category id")

  const body = await request.json().catch(() => null)
  const reassignTo = Number(body?.reassignTo)
  if (!Number.isInteger(reassignTo)) {
    return badRequest("reassignTo (the id of the category to move transactions into) is required")
  }

  const result = await deleteCategory(numericId, reassignTo)
  if (result === "same_category") {
    return badRequest("reassignTo must be a different category")
  }
  if (result === "not_found") {
    return Response.json({ error: "category not found" }, { status: 404 })
  }
  return new Response(null, { status: 204 })
}
