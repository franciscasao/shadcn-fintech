"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import type { Contact, TransferRecord } from "@/lib/types"
import { cn } from "@/lib/utils"
import { TransferStats } from "@/components/transfers/transfer-stats"
import { TransferList } from "@/components/transfers/transfer-list"
import { QuickSend } from "@/components/transfers/quick-send"

type TabKey = "all" | "sent" | "received" | "scheduled"

const tabs: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sent", label: "Sent" },
  { key: "received", label: "Received" },
  { key: "scheduled", label: "Scheduled" },
]

export function TransfersPageClient({
  initialTransfers,
  contacts,
}: {
  initialTransfers: TransferRecord[]
  contacts: Contact[]
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>("all")
  const transfers = initialTransfers

  const filtered = useMemo(() => {
    if (activeTab === "all") return transfers
    return transfers.filter((t) => t.type === activeTab)
  }, [activeTab, transfers])

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

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <TransferStats transfers={transfers} />

      {/* Tab filter bar */}
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
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

      {/* Transfer list */}
      <TransferList transfers={filtered} onCancel={handleCancel} />

      {/* Quick send */}
      <QuickSend contacts={contacts} onSend={handleSend} />
    </div>
  )
}
