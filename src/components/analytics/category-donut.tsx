"use client"

import { useMemo, useState } from "react"
import { PieChart, Pie, Cell } from "recharts"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeftIcon } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { assignCategoryColors } from "@/lib/chart-palette"
import type { CategoryBreakdown } from "@/lib/types"

export function CategoryDonut({
  categoryBreakdowns,
}: {
  categoryBreakdowns: CategoryBreakdown[]
}) {
  const [selected, setSelected] = useState<string | null>(null)

  const total = useMemo(
    () => categoryBreakdowns.reduce((s, c) => s + c.amount, 0),
    [categoryBreakdowns]
  )

  const selectedCategory = useMemo(
    () => categoryBreakdowns.find((c) => c.category === selected) ?? null,
    [categoryBreakdowns, selected]
  )

  // Colors follow the category (or subcategory) name — a fixed hue per
  // budget bucket, so re-sorting or drilling down never repaints one.
  const coloredCategories = useMemo(
    () => assignCategoryColors(categoryBreakdowns),
    [categoryBreakdowns]
  )

  const coloredSubcategories = useMemo(() => {
    if (!selectedCategory) return []
    return assignCategoryColors(
      selectedCategory.subcategories.map((s) => ({
        category: s.name,
        amount: s.amount,
      }))
    )
  }, [selectedCategory])

  const rows = selectedCategory ? coloredSubcategories : coloredCategories

  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {}
    rows.forEach((row) => {
      config[row.category] = { label: row.category, color: row.fill }
    })
    return config
  }, [rows])

  const pieData = useMemo(
    () => rows.map((row) => ({ name: row.category, value: row.amount, fill: row.fill })),
    [rows]
  )

  const centerAmount = selectedCategory ? selectedCategory.amount : total

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {selectedCategory
              ? selectedCategory.category
              : "Spending by Category"}
          </CardTitle>
          {selectedCategory && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setSelected(null)}
            >
              <ArrowLeftIcon className="size-3" />
              Back to all
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          <motion.div
            key={selected ?? "all"}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square h-[280px]"
            >
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        `₱${Number(value).toLocaleString()}`
                      }
                    />
                  }
                />
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={110}
                  strokeWidth={2}
                  stroke="var(--color-card)"
                  paddingAngle={2}
                  onClick={(_, index) => {
                    if (selectedCategory) return
                    const clicked = pieData[index]
                    // The synthetic "Other" slice aggregates multiple
                    // categories, so it has no single subcategory set to
                    // drill into — clicking it is a no-op.
                    const match =
                      clicked &&
                      categoryBreakdowns.find((c) => c.category === clicked.name)
                    if (match) setSelected(match.category)
                  }}
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.fill}
                      className={
                        !selectedCategory && entry.name !== "Other"
                          ? "cursor-pointer"
                          : ""
                      }
                    />
                  ))}
                </Pie>
                {/* Center label */}
                <text
                  x="50%"
                  y="47%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-foreground text-2xl font-bold tabular-nums"
                >
                  ₱{centerAmount.toLocaleString()}
                </text>
                <text
                  x="50%"
                  y="56%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-muted-foreground text-xs"
                >
                  {selectedCategory ? "category total" : "total spent"}
                </text>
              </PieChart>
            </ChartContainer>
          </motion.div>
        </AnimatePresence>

        {/* Legend */}
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          {pieData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: entry.fill }}
              />
              <span className="truncate text-muted-foreground">
                {entry.name}
              </span>
              <span className="ml-auto font-medium tabular-nums">
                ₱{entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
