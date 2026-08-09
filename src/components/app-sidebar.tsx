"use client"

import * as React from "react"
import Link from "next/link"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  WalletIcon,
  ArrowLeftRightIcon,
  CreditCardIcon,
  ChartAreaIcon,
  TargetIcon,
  SettingsIcon,
  LandmarkIcon,
  SendIcon,
  BellIcon,
} from "lucide-react"
import type { Notification } from "@/lib/types"
import { moduleIdForHref } from "@/lib/modules"
import { useDisabledModules } from "@/hooks/use-disabled-modules"

// Crypto, Investments, and Help & Support are still fully working routes
// (see @/lib/modules — they're deliberately left routable, not disabled)
// but are sample-data-only for now, so they're left off the nav entirely
// rather than advertised alongside the real, DB-backed pages below. Same
// for /sign-in and /sign-up, which have never been backed by real auth.
const data = {
  navDaily: [
    { title: "Overview", url: "/dashboard", icon: <LayoutDashboardIcon /> },
    { title: "Accounts", url: "/accounts", icon: <WalletIcon /> },
    { title: "Transactions", url: "/transactions", icon: <ArrowLeftRightIcon /> },
    { title: "Cards", url: "/cards", icon: <CreditCardIcon /> },
    { title: "Transfers", url: "/transfers", icon: <SendIcon /> },
  ],
  navInsights: [
    { title: "Analytics", url: "/analytics", icon: <ChartAreaIcon /> },
    { title: "Budgets", url: "/budgets", icon: <TargetIcon /> },
  ],
  navSecondary: [
    { title: "Notifications", url: "/notifications", icon: <BellIcon /> },
    { title: "Settings", url: "/settings", icon: <SettingsIcon /> },
  ],
}

function filterByEnabledModules<T extends { url: string }>(
  items: T[],
  disabled: Set<string>
) {
  return items.filter((item) => {
    const moduleId = moduleIdForHref(item.url)
    return moduleId === null || !disabled.has(moduleId)
  })
}

export function AppSidebar({
  notifications,
  user,
  ...props
}: {
  notifications: Notification[]
  user: { name: string; email: string; avatar: string }
} & React.ComponentProps<typeof Sidebar>) {
  const { disabled } = useDisabledModules()

  const navDaily = filterByEnabledModules(data.navDaily, disabled)
  const navInsights = filterByEnabledModules(data.navInsights, disabled)
  const navSecondary = filterByEnabledModules(data.navSecondary, disabled)

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <LandmarkIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Shadcn Fintech</span>
                <span className="truncate text-xs text-muted-foreground">
                  Finance Dashboard
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navDaily.length > 0 && <NavMain items={navDaily} label="Daily" />}
        {navInsights.length > 0 && <NavMain items={navInsights} label="Insights" />}
        <NavSecondary items={navSecondary} notifications={notifications} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
