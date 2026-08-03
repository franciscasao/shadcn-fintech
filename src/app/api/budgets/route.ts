import { getBudgetCategories } from "@/server/queries/budgets"
import { createBudgetCategory } from "@/server/mutations/budgets"
import { KNOWN_ICON_NAMES } from "@/server/icon-colors"

export async function GET() {
  const categories = await getBudgetCategories()
  return Response.json(categories)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { category, budget, iconName } = body ?? {}
  if (
    typeof category !== "string" ||
    !category.trim() ||
    category.trim().length > 24 ||
    !Number.isFinite(Number(budget)) ||
    Number(budget) <= 0 ||
    typeof iconName !== "string" ||
    !KNOWN_ICON_NAMES.includes(iconName)
  ) {
    return Response.json(
      {
        error:
          "category (1-24 chars), budget (a positive number), and a known iconName are required",
      },
      { status: 400 }
    )
  }

  const created = await createBudgetCategory({
    category: category.trim(),
    budget: Number(budget),
    iconName,
  })
  if (!created) {
    return Response.json(
      { error: "A budget for that category already exists" },
      { status: 409 }
    )
  }
  return Response.json(created, { status: 201 })
}
