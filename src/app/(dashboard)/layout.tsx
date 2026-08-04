import { AppSidebar } from "@/components/app-sidebar"
import { CommandPalette } from "@/components/command-palette"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
import { ModuleGate } from "@/components/module-gate"
import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getNotifications } from "@/server/queries/notifications"
import { getContacts } from "@/server/queries/contacts"
import { getRecentTransactions } from "@/server/queries/transactions"

// Every page under this layout reads live data from SQLite via better-sqlite3,
// which Next.js can't detect as "dynamic" the way it does fetch() — without
// this, the previous-model default static optimizer would prerender these
// routes once at build time and freeze their data. See caching-without-cache-
// components.md's `dynamic` route segment config.
export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [notifications, contacts, recentTransactions] = await Promise.all([
    getNotifications(),
    getContacts(),
    getRecentTransactions(),
  ])

  return (
    <SidebarProvider>
      <AppSidebar notifications={notifications} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <DynamicBreadcrumb />
          </div>
          <div className="ml-auto flex items-center gap-2 pr-4">
            <kbd className="pointer-events-none hidden h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
            <ThemeToggle />
          </div>
        </header>
        <CommandPalette contacts={contacts} recentTransactions={recentTransactions} />
        <main className="flex flex-1 flex-col">
          <ModuleGate>{children}</ModuleGate>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
