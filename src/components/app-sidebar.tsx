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
  LifeBuoyIcon,
  LandmarkIcon,
  SendIcon,
  TrendingUpIcon,
  BitcoinIcon,
  BellIcon,
  LogInIcon,
  UserPlusIcon,
} from "lucide-react"
import type { Notification } from "@/lib/types"
import { moduleIdForHref } from "@/lib/modules"
import { useDisabledModules } from "@/hooks/use-disabled-modules"

const data = {
  user: {
    name: "Abderrahim G.",
    email: "abderrahim@fintech.com",
    avatar: "/avatars/user.jpg",
  },
  navDaily: [
    { title: "Overview", url: "/dashboard", icon: <LayoutDashboardIcon /> },
    { title: "Accounts", url: "/accounts", icon: <WalletIcon /> },
    { title: "Transactions", url: "/transactions", icon: <ArrowLeftRightIcon /> },
    { title: "Cards", url: "/cards", icon: <CreditCardIcon /> },
  ],
  navMoney: [
    { title: "Transfers", url: "/transfers", icon: <SendIcon /> },
    { title: "Investments", url: "/investments", icon: <TrendingUpIcon /> },
    { title: "Crypto", url: "/crypto", icon: <BitcoinIcon /> },
  ],
  navInsights: [
    { title: "Analytics", url: "/analytics", icon: <ChartAreaIcon /> },
    { title: "Budgets", url: "/budgets", icon: <TargetIcon /> },
  ],
  navAuth: [
    { title: "Sign In", url: "/sign-in", icon: <LogInIcon /> },
    { title: "Sign Up", url: "/sign-up", icon: <UserPlusIcon /> },
  ],
  navSecondary: [
    { title: "Notifications", url: "/notifications", icon: <BellIcon /> },
    { title: "Settings", url: "/settings", icon: <SettingsIcon /> },
    { title: "Help & Support", url: "/support", icon: <LifeBuoyIcon /> },
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
  ...props
}: { notifications: Notification[] } & React.ComponentProps<typeof Sidebar>) {
  const { disabled } = useDisabledModules()

  const navDaily = filterByEnabledModules(data.navDaily, disabled)
  const navMoney = filterByEnabledModules(data.navMoney, disabled)
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
        {navMoney.length > 0 && <NavMain items={navMoney} label="Money" />}
        {navInsights.length > 0 && <NavMain items={navInsights} label="Insights" />}
        <NavMain items={data.navAuth} label="Auth" />
        <NavSecondary items={navSecondary} notifications={notifications} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
