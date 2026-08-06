import { currentBudgetMonth, getBudgetCategories, getSavingsGoals } from "@/server/queries/budgets"
import { getDailySpending } from "@/server/queries/analytics"
import { BudgetRings } from "@/components/budgets/budget-rings"
import { SavingsGoals } from "@/components/budgets/savings-goals"
import { SpendingCalendar } from "@/components/budgets/spending-calendar"
import { MonthProjection } from "@/components/budgets/month-projection"

// Reads live data from SQLite on every request — see (dashboard)/layout.tsx.
export const dynamic = "force-dynamic"

export default async function Page() {
  const [budgetCategories, savingsGoals, dailySpending] = await Promise.all([
    getBudgetCategories(),
    getSavingsGoals(),
    getDailySpending(),
  ])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <BudgetRings budgetCategories={budgetCategories} month={currentBudgetMonth()} />
      <SavingsGoals savingsGoals={savingsGoals} />
      <div className="grid gap-4 lg:grid-cols-2">
        <SpendingCalendar dailySpending={dailySpending} />
        <MonthProjection budgetCategories={budgetCategories} dailySpending={dailySpending} />
      </div>
    </div>
  )
}
