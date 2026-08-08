"use client"

import { useEffect, useState, type ReactNode } from "react"
import { ChevronDownIcon, LoaderIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CARD_PRODUCT_LABELS } from "@/lib/ph-cards"
import type { CardData } from "@/lib/types"

interface CardControlsProps {
  card: CardData
  frozen: boolean
  onToggleFreeze: () => void
  dailyLimit: number
  onDailyLimitChange: (val: number) => void
  /** Fired once when the user releases the slider — persists the value. */
  onDailyLimitCommit: (val: number) => void
  onUpdateCreditTerms: (terms: {
    creditLimit: number
    apr: number
    statementDay: number
    dueDay: number
  }) => Promise<void>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function CardControls({
  card,
  frozen,
  onToggleFreeze,
  dailyLimit,
  onDailyLimitChange,
  onDailyLimitCommit,
  onUpdateCreditTerms,
}: CardControlsProps) {
  const spendPercent =
    card.monthlyLimit > 0
      ? Math.round((card.monthlySpend / card.monthlyLimit) * 100)
      : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Card Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ── Freeze Toggle ── */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Card Status</p>
            <p
              className={cn(
                "text-xs",
                frozen ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {frozen ? "Frozen" : "Active"}
            </p>
          </div>
          <Switch
            checked={frozen}
            onCheckedChange={(checked) => {
              if (checked !== frozen) onToggleFreeze()
            }}
          />
        </div>

        {/* ── Daily Limit ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Daily Limit</p>
            <span className="text-sm font-medium tabular-nums">
              {formatCurrency(dailyLimit)}
            </span>
          </div>
          <Slider
            value={[dailyLimit]}
            min={0}
            max={10000}
            step={100}
            onValueChange={(value) => {
              const v = Array.isArray(value) ? value[0] : value
              onDailyLimitChange(v)
            }}
            onValueCommitted={(value) => {
              const v = Array.isArray(value) ? value[0] : value
              onDailyLimitCommit(v)
            }}
          />
          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>₱0</span>
            <span>₱10,000</span>
          </div>
        </div>

        {/* ── Monthly Usage ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Monthly Usage</p>
            <span className="text-xs text-muted-foreground tabular-nums">
              {spendPercent}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                spendPercent >= 90
                  ? "bg-destructive"
                  : spendPercent >= 70
                    ? "bg-amber-500"
                    : "bg-primary",
              )}
              style={{ width: `${Math.min(spendPercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>{formatCurrency(card.monthlySpend)}</span>
            <span>{formatCurrency(card.monthlyLimit)}</span>
          </div>
        </div>

        {/* ── Credit Terms ── */}
        {card.product === "credit" && (
          <CreditTermsEditor card={card} onSave={onUpdateCreditTerms} />
        )}

        {/* ── Card Info ── */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Card Info</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={card.type === "virtual" ? "secondary" : "outline"}>
              {card.type}
            </Badge>
            <Badge variant="outline">{CARD_PRODUCT_LABELS[card.product]}</Badge>
            <Badge variant="outline" className="uppercase">
              {card.network}
            </Badge>
            <span className="text-xs text-muted-foreground tabular-nums">
              **** {card.last4}
            </span>
          </div>
          {(card.issuer || card.accountName) && (
            <p className="text-xs text-muted-foreground">
              {card.issuer && <>Issued by {card.issuer}</>}
              {card.issuer && card.accountName && " · "}
              {card.accountName && <>Funding account: {card.accountName}</>}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/** Inline edit for a credit card's terms (credit limit, APR, statement/due
 * day) — collapsed by default, matching the "Limits & appearance" pattern in
 * @/components/cards/add-card-dialog. Local draft state, discarded on
 * cancel or on collapse. */
function CreditTermsEditor({
  card,
  onSave,
}: {
  card: CardData
  onSave: (terms: { creditLimit: number; apr: number; statementDay: number; dueDay: number }) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [creditLimit, setCreditLimit] = useState(String(card.creditLimit ?? 0))
  const [apr, setApr] = useState(String(card.apr ?? 0))
  const [statementDay, setStatementDay] = useState(String(card.statementDay ?? 1))
  const [dueDay, setDueDay] = useState(String(card.dueDay ?? 1))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset the draft to the latest server values whenever the panel (re)opens
  // or the underlying card changes — e.g. after switching to a different
  // credit card in the list.
  useEffect(() => {
    if (!open) return
    setCreditLimit(String(card.creditLimit ?? 0))
    setApr(String(card.apr ?? 0))
    setStatementDay(String(card.statementDay ?? 1))
    setDueDay(String(card.dueDay ?? 1))
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, card.id])

  const dayOfMonth = /^([1-9]|[12]\d|3[01])$/
  const canSave =
    creditLimit.trim() !== "" &&
    Number(creditLimit) >= 0 &&
    apr.trim() !== "" &&
    Number(apr) >= 0 &&
    Number(apr) <= 100 &&
    dayOfMonth.test(statementDay) &&
    dayOfMonth.test(dueDay)

  async function handleSave() {
    if (!canSave || saving) return
    setSaving(true)
    setError(null)
    try {
      await onSave({
        creditLimit: Number(creditLimit),
        apr: Number(apr),
        statementDay: Number(statementDay),
        dueDay: Number(dueDay),
      })
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save credit terms — try again")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-3 text-left">
        <span className="text-xs font-semibold text-muted-foreground">Credit terms</span>
        <ChevronDownIcon
          className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 flex flex-col gap-3 rounded-lg border p-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Credit limit (₱)">
            <Input type="number" min={0} value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
          </Field>
          <Field label="APR (%)">
            <Input type="number" min={0} max={100} step={0.1} value={apr} onChange={(e) => setApr(e.target.value)} />
          </Field>
          <Field label="Statement day">
            <Input type="number" min={1} max={31} value={statementDay} onChange={(e) => setStatementDay(e.target.value)} />
          </Field>
          <Field label="Due day">
            <Input type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
          </Field>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button size="sm" disabled={!canSave || saving} onClick={handleSave}>
          {saving ? (
            <>
              <LoaderIcon className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save credit terms"
          )}
        </Button>
      </CollapsibleContent>
    </Collapsible>
  )
}
