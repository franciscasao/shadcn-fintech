import { Suspense } from "react"
import { getCategories } from "@/server/queries/categories"
import { getCurrentUser } from "@/server/queries/user"
import { SettingsPageClient } from "@/components/settings/settings-page-client"

export default async function Page() {
  const [categories, user] = await Promise.all([getCategories(), getCurrentUser()])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <Suspense>
        <SettingsPageClient categories={categories} user={user} />
      </Suspense>
    </div>
  )
}
