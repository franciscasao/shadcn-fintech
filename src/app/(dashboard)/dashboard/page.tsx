import { getContacts } from "@/server/queries/contacts"
import { getRecentTransactions } from "@/server/queries/transactions"
import { getFinancialOverview, getMoneyMovement, getSpendingLimitSummary } from "@/server/queries/analytics"
import { getAccounts } from "@/server/queries/accounts"
import { DashboardCustomizer, type DashboardData } from "@/components/dashboard/dashboard-customizer"

// Reads live data from SQLite on every request — see (dashboard)/layout.tsx.
export const dynamic = "force-dynamic"

export default async function Page() {
  const [contacts, recentTransactions, financialOverview, moneyMovementByPeriod, spendingLimit, accounts] =
    await Promise.all([
      getContacts(),
      getRecentTransactions(),
      getFinancialOverview(),
      getMoneyMovement(),
      getSpendingLimitSummary(),
      getAccounts(),
    ])

  const data: DashboardData = {
    contacts,
    recentTransactions,
    financialOverview,
    moneyMovementByPeriod,
    spendingLimit,
    accounts,
  }

  return <DashboardCustomizer data={data} />
}
