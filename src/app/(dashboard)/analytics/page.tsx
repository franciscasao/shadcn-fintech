import {
  getCategoryBreakdown,
  getMonthComparison,
  getRecurringCharges,
  getSpendingHeatmap,
} from "@/server/queries/analytics"
import { SpendingHeatmap } from "@/components/analytics/spending-heatmap"
import { CategoryDonut } from "@/components/analytics/category-donut"
import { MonthComparison } from "@/components/analytics/month-comparison"
import { RecurringDetector } from "@/components/analytics/recurring-detector"
import { AiInsights } from "@/components/analytics/ai-insights"

// Reads live data from SQLite on every request — see (dashboard)/layout.tsx.
export const dynamic = "force-dynamic"

export default async function Page() {
  const [heatmap, categories, monthComparison, recurring] = await Promise.all([
    getSpendingHeatmap(),
    getCategoryBreakdown(),
    getMonthComparison(),
    getRecurringCharges(),
  ])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Row 1: Heatmap */}
      <SpendingHeatmap spendingHeatmapData={heatmap} />

      {/* Row 2: Donut + Month Comparison */}
      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryDonut categoryBreakdowns={categories} />
        <MonthComparison monthComparisons={monthComparison} />
      </div>

      {/* Row 3: Recurring + AI Insights */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RecurringDetector recurringCharges={recurring} />
        <AiInsights />
      </div>
    </div>
  )
}
