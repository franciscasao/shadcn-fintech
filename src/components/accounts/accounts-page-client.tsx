"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import type { BankAccount } from "@/lib/types"
import { cn } from "@/lib/utils"
import { AccountSummary } from "@/components/accounts/account-summary"
import { AccountCard } from "@/components/accounts/account-grid"
import { AddAccount, type NewAccountInput } from "@/components/accounts/add-account"
import { EditBalanceDialog } from "@/components/accounts/edit-balance-dialog"
import { EmptyState } from "@/components/empty-state"

const filterTabs = [
  { value: "all", label: "All" },
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "crypto", label: "Crypto" },
  { value: "investment", label: "Investment" },
] as const

type AccountType = (typeof filterTabs)[number]["value"]

export function AccountsPageClient({
  initialAccounts,
}: {
  initialAccounts: BankAccount[]
}) {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<AccountType>("all")
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const accounts = initialAccounts

  const filtered = useMemo(
    () =>
      selectedType === "all"
        ? accounts
        : accounts.filter((a) => a.type === selectedType),
    [accounts, selectedType]
  )

  async function handleAddAccount(input: NewAccountInput) {
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error("Failed to link account")
    router.refresh()
  }

  async function handleSaveBalance(accountId: string, balance: number) {
    const res = await fetch(`/api/accounts/${accountId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ balance }),
    })
    if (!res.ok) throw new Error("Failed to update balance")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Summary row */}
      <AccountSummary accounts={accounts} />

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setSelectedType(tab.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              selectedType === tab.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Account grid + add card */}
      {filtered.length === 0 ? (
        <EmptyState
          variant="filter"
          title="No accounts in this category"
          description="You don't have any accounts of this type yet. Try a different filter or link a new account."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((account, i) => (
            <AccountCard
              key={account.id}
              account={account}
              index={i}
              onSelect={setEditingAccount}
            />
          ))}
          <AddAccount onAdd={handleAddAccount} />
        </div>
      )}

      <EditBalanceDialog
        account={editingAccount}
        onOpenChange={(open) => !open && setEditingAccount(null)}
        onSave={handleSaveBalance}
      />
    </div>
  )
}
