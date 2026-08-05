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
  DEFAULT_LIMITS,
  NETWORK_LABELS,
  getCardIssuerProfile,
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

  const [dailyLimit, setDailyLimit] = useState("")
  const [monthlyLimit, setMonthlyLimit] = useState("")
  const [color, setColor] = useState(CARD_COLORS[0].className)
  const [limitsOpen, setLimitsOpen] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    setDailyLimit("")
    setMonthlyLimit("")
    setColor(CARD_COLORS[0].className)
    setLimitsOpen(false)
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

  const canSubmit =
    name.trim() !== "" &&
    holder.trim() !== "" &&
    type !== "" &&
    product !== "" &&
    network !== "" &&
    (selection?.kind !== "custom" || issuerName.trim() !== "")

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
        dailyLimit: dailyLimit ? Number(dailyLimit) : undefined,
        monthlyLimit: monthlyLimit ? Number(monthlyLimit) : undefined,
        color,
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
              : "Review the prefilled details, then issue the card."}
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
                  Funding account:{" "}
                  <span className="font-medium text-foreground">
                    {selection.account.name}
                  </span>{" "}
                  ({selection.account.institution} {selection.account.accountNumber})
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
