"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeftRightIcon } from "lucide-react"

import type { BankAccount } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { AccountSummary } from "@/components/accounts/account-summary"
import { AccountCard } from "@/components/accounts/account-grid"
import { AddAccount, type NewAccountInput } from "@/components/accounts/add-account"
import { EditBalanceDialog } from "@/components/accounts/edit-balance-dialog"
import { DeleteAccountDialog } from "@/components/accounts/delete-account-dialog"
import { EmptyState } from "@/components/empty-state"
import { TransferBetweenAccountsDialog } from "@/components/transfers/transfer-between-accounts-dialog"
import type { NewInternalTransferInput } from "@/server/mutations/transfers"
import type { AccountImpact } from "@/server/queries/accounts"

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
  impacts,
}: {
  initialAccounts: BankAccount[]
  impacts: Record<string, AccountImpact>
}) {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<AccountType>("all")
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [deletingAccount, setDeletingAccount] = useState<BankAccount | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
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

  async function handleDeleteAccount(accountId: string) {
    const res = await fetch(`/api/accounts/${accountId}`, { method: "DELETE" })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.error ?? "Couldn't delete account")
    }
    router.refresh()
  }

  async function handleInternalTransfer(input: NewInternalTransferInput) {
    const res = await fetch("/api/transfers/internal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.error ?? "Couldn't complete transfer")
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Summary row */}
      <AccountSummary accounts={accounts} />

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
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
        {accounts.length >= 2 && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setTransferOpen(true)}
          >
            <ArrowLeftRightIcon className="size-3.5" />
            Transfer
          </Button>
        )}
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
              onDelete={setDeletingAccount}
              onViewTransactions={(a) => router.push(`/transactions?account=${a.id}`)}
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

      <DeleteAccountDialog
        account={deletingAccount}
        isOnlyAccount={accounts.length <= 1}
        impact={deletingAccount ? impacts[deletingAccount.id] : undefined}
        onOpenChange={(open) => !open && setDeletingAccount(null)}
        onDelete={handleDeleteAccount}
      />

      <TransferBetweenAccountsDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        accounts={accounts}
        onSubmit={handleInternalTransfer}
      />
    </div>
  )
}
