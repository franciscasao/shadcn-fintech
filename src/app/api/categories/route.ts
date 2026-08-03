import { getCategories } from "@/server/queries/categories"
import { getBudgetBuckets } from "@/server/queries/budgets"
import { createCategory } from "@/server/mutations/categories"
import { KNOWN_ICON_NAMES } from "@/server/icon-colors"

export async function GET() {
  const categories = await getCategories()
  return Response.json(categories)
}

export async function POST(request: Request) {
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
    return Response.json(
      { error: "name (1-24 chars), a known iconName, and an optional budgetBucket are required" },
      { status: 400 }
    )
  }

  const buckets = await getBudgetBuckets()
  if (budgetBucket && !buckets.includes(budgetBucket)) {
    return Response.json({ error: "budgetBucket is not a known bucket" }, { status: 400 })
  }

  const created = await createCategory({
    name: name.trim(),
    iconName,
    budgetBucket: budgetBucket ?? null,
  })
  if (!created) {
    return Response.json({ error: "A category with that name already exists" }, { status: 409 })
  }
  return Response.json(created, { status: 201 })
}
