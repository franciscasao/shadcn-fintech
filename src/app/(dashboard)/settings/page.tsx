import { Suspense } from "react"
import { getCategories } from "@/server/queries/categories"
import { getBudgetBuckets } from "@/server/queries/budgets"
import { getCurrentUser } from "@/server/queries/user"
import { SettingsPageClient } from "@/components/settings/settings-page-client"

export default async function Page() {
  const [categories, buckets, user] = await Promise.all([
    getCategories(),
    getBudgetBuckets(),
    getCurrentUser(),
  ])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <Suspense>
        <SettingsPageClient categories={categories} buckets={buckets} user={user} />
      </Suspense>
    </div>
  )
}
