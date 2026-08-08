"use client"

import { useEffect, useState, type ReactNode } from "react"
import { ChevronLeftIcon, ChevronDownIcon, LoaderIcon, CheckIcon } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { InstitutionLogo } from "@/components/accounts/institution-logo"
import { CardIssuerPicker, type CardIssuerSelection } from "@/components/cards/card-issuer-picker"
import {
  CARD_COLORS,
  CARD_PRODUCT_LABELS,
  CARD_TYPE_LABELS,
  CUSTOM_ISSUER_PROFILE,
  DEFAULT_CREDIT_TERMS,
  DEFAULT_LIMITS,
  NETWORK_LABELS,
  getCardIssuerProfile,
  isValidExpiry,
  isValidLast4,
  type CardIssuerProfile,
  type NewCardInput,
} from "@/lib/ph-cards"
import type { BankAccount, CardNetwork, CardProduct } from "@/lib/types"

interface AddCardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: BankAccount[]
  holderName: string
  onAdd: (input: NewCardInput) => Promise<void>
}

type Step = "issuer" | "details"

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

/** Formats raw expiry keystrokes into MM/YY as the user types, e.g. "0928" -> "09/28". */
function formatExpiryInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

export function AddCardDialog({ open, onOpenChange, accounts, holderName, onAdd }: AddCardDialogProps) {
  const [step, setStep] = useState<Step>("issuer")
  const [selection, setSelection] = useState<CardIssuerSelection | null>(null)
  const [profile, setProfile] = useState<CardIssuerProfile>(CUSTOM_ISSUER_PROFILE)

  const [issuerName, setIssuerName] = useState("")
  const [name, setName] = useState("")
  const [type, setType] = useState<"physical" | "virtual" | "">("")
  const [product, setProduct] = useState<CardProduct | "">("")
  const [network, setNetwork] = useState<CardNetwork | "">("")
  const [holder, setHolder] = useState(holderName)
  const [last4, setLast4] = useState("")
  const [expiry, setExpiry] = useState("")

  const [dailyLimit, setDailyLimit] = useState("")
  const [monthlyLimit, setMonthlyLimit] = useState("")
  const [color, setColor] = useState(CARD_COLORS[0].className)
  const [limitsOpen, setLimitsOpen] = useState(false)

  // Credit terms — only collected (and only sent) when product === "credit".
  const [creditLimit, setCreditLimit] = useState(String(DEFAULT_CREDIT_TERMS.creditLimit))
  const [apr, setApr] = useState(String(DEFAULT_CREDIT_TERMS.apr))
  const [statementDay, setStatementDay] = useState(String(DEFAULT_CREDIT_TERMS.statementDay))
  const [dueDay, setDueDay] = useState(String(DEFAULT_CREDIT_TERMS.dueDay))

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCredit = product === "credit"

  function resetAll() {
    setStep("issuer")
    setSelection(null)
    setProfile(CUSTOM_ISSUER_PROFILE)
    setIssuerName("")
    setName("")
    setType("")
    setProduct("")
    setNetwork("")
    setHolder(holderName)
    setLast4("")
    setExpiry("")
    setDailyLimit("")
    setMonthlyLimit("")
    setColor(CARD_COLORS[0].className)
    setLimitsOpen(false)
    setCreditLimit(String(DEFAULT_CREDIT_TERMS.creditLimit))
    setApr(String(DEFAULT_CREDIT_TERMS.apr))
    setStatementDay(String(DEFAULT_CREDIT_TERMS.statementDay))
    setDueDay(String(DEFAULT_CREDIT_TERMS.dueDay))
    setError(null)
  }

  // Reset whenever the dialog closes, whether the user dismissed it or the
  // parent closed it programmatically after a successful onAdd.
  useEffect(() => {
    if (!open) resetAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function applyDefaults(p: CardIssuerProfile) {
    setProduct(p.defaultProduct)
    setNetwork(p.defaultNetwork)
    setType(p.cardTypes[0])
    const limits = DEFAULT_LIMITS[p.defaultProduct]
    setDailyLimit(String(limits.daily))
    setMonthlyLimit(String(limits.monthly))
  }

  function handleChooseIssuer(next: CardIssuerSelection) {
    setError(null)
    setSelection(next)
    setName("")
    setLimitsOpen(false)

    if (next.kind === "account") {
      const p = getCardIssuerProfile(next.account.templateId) ?? CUSTOM_ISSUER_PROFILE
      setProfile(p)
      setIssuerName(next.account.institution)
      setColor(next.account.color || CARD_COLORS[0].className)
      applyDefaults(p)
    } else if (next.kind === "template") {
      const p = getCardIssuerProfile(next.template.id) ?? CUSTOM_ISSUER_PROFILE
      setProfile(p)
      setIssuerName(next.template.name)
      setColor(next.template.color)
      applyDefaults(p)
    } else {
      setProfile(CUSTOM_ISSUER_PROFILE)
      setIssuerName("")
      setColor(CARD_COLORS[0].className)
      applyDefaults(CUSTOM_ISSUER_PROFILE)
    }
    setStep("details")
  }

  function handleProductChange(next: CardProduct) {
    setProduct(next)
    const limits = DEFAULT_LIMITS[next]
    setDailyLimit(String(limits.daily))
    setMonthlyLimit(String(limits.monthly))
  }

  const dayOfMonth = /^([1-9]|[12]\d|3[01])$/

  const canSubmit =
    name.trim() !== "" &&
    holder.trim() !== "" &&
    type !== "" &&
    product !== "" &&
    network !== "" &&
    isValidLast4(last4) &&
    isValidExpiry(expiry) &&
    (selection?.kind !== "custom" || issuerName.trim() !== "") &&
    (!isCredit ||
      (creditLimit.trim() !== "" &&
        Number(creditLimit) >= 0 &&
        apr.trim() !== "" &&
        Number(apr) >= 0 &&
        Number(apr) <= 100 &&
        dayOfMonth.test(statementDay) &&
        dayOfMonth.test(dueDay)))

  async function handleSubmit() {
    if (!canSubmit || submitting || !selection) return
    setSubmitting(true)
    setError(null)
    try {
      const issuerTemplateId =
        selection.kind === "template"
          ? selection.template.id
          : selection.kind === "account"
            ? selection.account.templateId
            : null
      const input: NewCardInput = {
        accountId: selection.kind === "account" ? selection.account.id : null,
        issuerTemplateId,
        issuer: issuerTemplateId
          ? ""
          : selection.kind === "account"
            ? selection.account.institution
            : issuerName.trim(),
        name: name.trim(),
        type: type as "physical" | "virtual",
        product: product as CardProduct,
        network: network as CardNetwork,
        holder: holder.trim(),
        last4,
        expiry,
        dailyLimit: dailyLimit ? Number(dailyLimit) : undefined,
        monthlyLimit: monthlyLimit ? Number(monthlyLimit) : undefined,
        color,
        creditLimit: isCredit && creditLimit ? Number(creditLimit) : undefined,
        apr: isCredit && apr ? Number(apr) : undefined,
        statementDay: isCredit && statementDay ? Number(statementDay) : undefined,
        dueDay: isCredit && dueDay ? Number(dueDay) : undefined,
      }
      await onAdd(input)
      // Success: parent closes the dialog via onOpenChange, which triggers resetAll.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't issue card — try again")
    } finally {
      setSubmitting(false)
    }
  }

  const titleLogo =
    selection?.kind === "account"
      ? selection.account.institutionLogo
      : selection?.kind === "template"
        ? selection.template.logo
        : null
  const titleText =
    selection?.kind === "account"
      ? selection.account.institution
      : selection?.kind === "template"
        ? selection.template.name
        : "Custom issuer"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-md", step === "details" && "sm:max-w-lg")}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "details" && titleLogo && <InstitutionLogo src={titleLogo} size={20} />}
            {step === "issuer" ? "Issue a card" : titleText}
          </DialogTitle>
          <DialogDescription>
            {step === "issuer"
              ? "Choose a linked account or a Philippine bank to issue the card from."
              : "Enter the card's last 4 digits and expiry, then issue the card."}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait" initial={false}>
          {step === "issuer" && (
            <motion.div
              key="issuer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <CardIssuerPicker accounts={accounts} onSelect={handleChooseIssuer} />
            </motion.div>
          )}

          {step === "details" && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              <button
                type="button"
                onClick={() => setStep("issuer")}
                className="flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ChevronLeftIcon className="size-3.5" />
                Choose a different issuer
              </button>

              {selection?.kind === "account" && (
                <div className="rounded-lg border p-3 text-xs text-muted-foreground">
                  {isCredit ? (
                    <>
                      Issued via <span className="font-medium text-foreground">{selection.account.institution}</span> —
                      credit cards draw on their own credit line, not {selection.account.name}.
                    </>
                  ) : (
                    <>
                      Funding account:{" "}
                      <span className="font-medium text-foreground">
                        {selection.account.name}
                      </span>{" "}
                      ({selection.account.institution} {selection.account.accountNumber})
                    </>
                  )}
                </div>
              )}

              {selection?.kind === "custom" && (
                <Field label="Issuer name">
                  <Input
                    value={issuerName}
                    onChange={(e) => setIssuerName(e.target.value)}
                    placeholder="e.g. BPI"
                  />
                </Field>
              )}

              <Field label="Card label">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Everyday Debit"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Last 4 digits">
                  <Input
                    value={last4}
                    onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    inputMode="numeric"
                    placeholder="4589"
                    className="tabular-nums"
                  />
                </Field>
                <Field label="Expiry (MM/YY)">
                  <Input
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiryInput(e.target.value))}
                    inputMode="numeric"
                    placeholder="09/28"
                    className="tabular-nums"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Card type">
                  <Select value={type} onValueChange={(v) => v && setType(v as "physical" | "virtual")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type">
                        {(v: "physical" | "virtual" | "") => (v ? CARD_TYPE_LABELS[v] : "Select type")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {profile.cardTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {CARD_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Product">
                  <Select value={product} onValueChange={(v) => v && handleProductChange(v as CardProduct)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select product">
                        {(v: CardProduct | "") => (v ? CARD_PRODUCT_LABELS[v] : "Select product")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {profile.products.map((p) => (
                        <SelectItem key={p} value={p}>
                          {CARD_PRODUCT_LABELS[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Network">
                  <Select value={network} onValueChange={(v) => v && setNetwork(v as CardNetwork)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select network">
                        {(v: CardNetwork | "") => (v ? NETWORK_LABELS[v] : "Select network")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {profile.networks.map((n) => (
                        <SelectItem key={n} value={n}>
                          {NETWORK_LABELS[n]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Cardholder name">
                  <Input value={holder} onChange={(e) => setHolder(e.target.value)} />
                </Field>
              </div>

              {isCredit && (
                <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
                  <Field label="Credit limit (₱)">
                    <Input
                      type="number"
                      min={0}
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                    />
                  </Field>
                  <Field label="APR (%)">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={apr}
                      onChange={(e) => setApr(e.target.value)}
                    />
                  </Field>
                  <Field label="Statement day">
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={statementDay}
                      onChange={(e) => setStatementDay(e.target.value)}
                    />
                  </Field>
                  <Field label="Due day">
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={dueDay}
                      onChange={(e) => setDueDay(e.target.value)}
                    />
                  </Field>
                </div>
              )}

              {profile.note && (
                <p className="text-xs text-muted-foreground">{profile.note}</p>
              )}

              <Collapsible open={limitsOpen} onOpenChange={setLimitsOpen}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-3 text-left">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Limits &amp; appearance
                  </span>
                  <ChevronDownIcon
                    className={cn(
                      "size-4 text-muted-foreground transition-transform",
                      limitsOpen && "rotate-180"
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 flex flex-col gap-3 rounded-lg border p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Daily limit (₱)">
                      <Input
                        type="number"
                        min={0}
                        max={10000}
                        value={dailyLimit}
                        onChange={(e) => setDailyLimit(e.target.value)}
                      />
                    </Field>
                    <Field label="Monthly limit (₱)">
                      <Input
                        type="number"
                        min={0}
                        value={monthlyLimit}
                        onChange={(e) => setMonthlyLimit(e.target.value)}
                      />
                    </Field>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Card color</span>
                    <div className="flex flex-wrap gap-2">
                      {CARD_COLORS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          title={c.label}
                          onClick={() => setColor(c.className)}
                          className={cn(
                            "flex size-8 items-center justify-center rounded-full transition-transform",
                            c.className,
                            color === c.className
                              ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                              : "hover:scale-105"
                          )}
                        >
                          {color === c.className && <CheckIcon className="size-3.5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!canSubmit || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? (
                    <>
                      <LoaderIcon className="size-4 animate-spin" />
                      Issuing…
                    </>
                  ) : (
                    "Issue card"
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
