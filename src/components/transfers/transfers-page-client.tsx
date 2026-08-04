"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeftRightIcon } from "lucide-react"

import type { BankAccount, Contact, TransferRecord } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { TransferStats } from "@/components/transfers/transfer-stats"
import { TransferList, type TransferSortKey } from "@/components/transfers/transfer-list"
import { QuickSend } from "@/components/transfers/quick-send"
import { TransferBetweenAccountsDialog } from "@/components/transfers/transfer-between-accounts-dialog"
import type { NewInternalTransferInput } from "@/server/mutations/transfers"
import { useTableSort } from "@/hooks/use-table-sort"

function nameOf(t: TransferRecord) {
  return t.kind === "internal"
    ? `${t.fromAccountName ?? ""} → ${t.toAccountName ?? ""}`
    : (t.contactName ?? "")
}

type TabKey = "all" | "sent" | "received" | "scheduled" | "internal"

const tabs: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sent", label: "Sent" },
  { key: "received", label: "Received" },
  { key: "scheduled", label: "Scheduled" },
  { key: "internal", label: "Between Accounts" },
]

export function TransfersPageClient({
  initialTransfers,
  contacts,
  accounts,
  defaultDate,
}: {
  initialTransfers: TransferRecord[]
  contacts: Contact[]
  accounts: BankAccount[]
  defaultDate: string
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>("all")
  const [internalOpen, setInternalOpen] = useState(false)
  const transfers = initialTransfers

  const filtered = useMemo(() => {
    if (activeTab === "all") return transfers
    if (activeTab === "internal") return transfers.filter((t) => t.kind === "internal")
    return transfers.filter((t) => t.type === activeTab)
  }, [activeTab, transfers])

  const { sortKey, sortDir, toggleSort: handleSort, sorted } = useTableSort<
    TransferRecord,
    TransferSortKey
  >(filtered, (a, b, key) => {
    switch (key) {
      case "name":
        return nameOf(a).localeCompare(nameOf(b))
      case "amount":
        return a.amount - b.amount
      case "date":
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      case "status":
        return a.status.localeCompare(b.status)
    }
  })

  async function handleCancel(id: string) {
    const res = await fetch(`/api/transfers/${id}`, { method: "DELETE" })
    if (res.ok) router.refresh()
  }

  async function handleSend(contactId: string, amount: number, note?: string) {
    const res = await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: Number(contactId), amount, note }),
    })
    if (res.ok) router.refresh()
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
      {/* Stats */}
      <TransferStats transfers={transfers} />

      {/* Tab filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setInternalOpen(true)}>
          <ArrowLeftRightIcon className="size-3.5" />
          Between accounts
        </Button>
      </div>

      {/* Transfer list */}
      <TransferList
        transfers={sorted}
        onCancel={handleCancel}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
      />

      {/* Quick send */}
      <QuickSend contacts={contacts} onSend={handleSend} />

      <TransferBetweenAccountsDialog
        open={internalOpen}
        onOpenChange={setInternalOpen}
        accounts={accounts}
        defaultDate={defaultDate}
        onSubmit={handleInternalTransfer}
      />
    </div>
  )
}
