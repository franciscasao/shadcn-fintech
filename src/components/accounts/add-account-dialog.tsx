"use client"

import { useEffect, useState, type ReactNode } from "react"
import { ChevronLeftIcon, ChevronDownIcon, LoaderIcon } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
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
import { InstitutionPicker } from "@/components/accounts/institution-picker"
import { type InstitutionTemplate, type NewAccountInput } from "@/lib/ph-institutions"
import type { BankAccount, CreditingFrequency, CreditingTiming } from "@/lib/types"

interface AddAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (input: NewAccountInput) => Promise<void>
}

type Step = "institution" | "details"
type Selection = { kind: "template"; template: InstitutionTemplate } | { kind: "custom" }

const TYPE_LABELS: Record<BankAccount["type"], string> = {
  checking: "Checking",
  savings: "Savings",
  crypto: "Crypto",
  investment: "Investment",
}
const ALL_TYPES: BankAccount["type"][] = ["checking", "savings", "crypto", "investment"]

const FREQUENCY_OPTIONS: { value: CreditingFrequency; label: string }[] = [
  { value: "none", label: "No interest" },
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "maturity", label: "At maturity" },
]
const TIMING_OPTIONS: { value: CreditingTiming; label: string }[] = [
  { value: "start_of_day", label: "Start of day" },
  { value: "end_of_day", label: "End of day" },
  { value: "month_end", label: "Month-end" },
  { value: "maturity", label: "Maturity" },
]

// This app's <Select> (base-ui, not Radix) only resolves a trigger's display
// label from an explicit `items` map — without one, <Select.Value> falls
// back to rendering the raw value string. Rather than pass `items` through
// every layer of the shared ui/select.tsx wrapper, each of this dialog's
// selects uses SelectValue's documented render-prop instead.
const FREQUENCY_LABELS: Record<CreditingFrequency, string> = Object.fromEntries(
  FREQUENCY_OPTIONS.map((f) => [f.value, f.label])
) as Record<CreditingFrequency, string>
const TIMING_LABELS: Record<CreditingTiming, string> = Object.fromEntries(
  TIMING_OPTIONS.map((t) => [t.value, t.label])
) as Record<CreditingTiming, string>

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

export function AddAccountDialog({ open, onOpenChange, onAdd }: AddAccountDialogProps) {
  const [step, setStep] = useState<Step>("institution")
  const [selection, setSelection] = useState<Selection | null>(null)

  const [institution, setInstitution] = useState("")
  const [type, setType] = useState<BankAccount["type"] | "">("")
  const [accountNumber, setAccountNumber] = useState("")
  const [nickname, setNickname] = useState("")
  const [balance, setBalance] = useState("0")

  const [interestRate, setInterestRate] = useState("")
  const [creditingFrequency, setCreditingFrequency] = useState<CreditingFrequency>("none")
  const [creditingTiming, setCreditingTiming] = useState<CreditingTiming | "">("")
  const [compounding, setCompounding] = useState(false)
  const [pdicInsured, setPdicInsured] = useState(false)

  const [maintainingBalance, setMaintainingBalance] = useState("")
  const [interestCap, setInterestCap] = useState("")
  const [requiredAdb, setRequiredAdb] = useState("")
  const [monthlyFee, setMonthlyFee] = useState("")
  const [freeTransfersPerMonth, setFreeTransfersPerMonth] = useState("")
  const [instapayFee, setInstapayFee] = useState("")
  const [pesonetFee, setPesonetFee] = useState("")
  const [dailyTransferLimit, setDailyTransferLimit] = useState("")
  const [feesOpen, setFeesOpen] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resetAll() {
    setStep("institution")
    setSelection(null)
    setInstitution("")
    setType("")
    setAccountNumber("")
    setNickname("")
    setBalance("0")
    setInterestRate("")
    setCreditingFrequency("none")
    setCreditingTiming("")
    setCompounding(false)
    setPdicInsured(false)
    setMaintainingBalance("")
    setInterestCap("")
    setRequiredAdb("")
    setMonthlyFee("")
    setFreeTransfersPerMonth("")
    setInstapayFee("")
    setPesonetFee("")
    setDailyTransferLimit("")
    setFeesOpen(false)
    setError(null)
  }

  // Reset whenever the dialog closes, whether the user dismissed it or the
  // parent closed it programmatically after a successful onAdd (that path
  // sets `open={false}` directly and never calls this component's own
  // close handlers).
  useEffect(() => {
    if (!open) resetAll()
  }, [open])

  function handleChooseTemplate(template: InstitutionTemplate | null) {
    setError(null)
    setAccountNumber("")
    setNickname("")
    setBalance("0")
    setFeesOpen(false)

    if (template) {
      setSelection({ kind: "template", template })
      setInstitution(template.name)
      setType(template.defaultType)
      setInterestRate(template.interestRate != null ? String(template.interestRate) : "")
      setCreditingFrequency(template.creditingFrequency)
      setCreditingTiming(template.creditingTiming ?? "")
      setCompounding(template.compounding)
      setPdicInsured(template.pdicInsured)
      setMaintainingBalance(
        template.maintainingBalance != null ? String(template.maintainingBalance) : ""
      )
      setInterestCap(template.interestCap != null ? String(template.interestCap) : "")
      setRequiredAdb(template.requiredAdb != null ? String(template.requiredAdb) : "")
      setMonthlyFee(template.monthlyFee != null ? String(template.monthlyFee) : "")
      setFreeTransfersPerMonth(
        template.freeTransfersPerMonth != null ? String(template.freeTransfersPerMonth) : ""
      )
      setInstapayFee(template.instapayFee != null ? String(template.instapayFee) : "")
      setPesonetFee(template.pesonetFee != null ? String(template.pesonetFee) : "")
      setDailyTransferLimit(
        template.dailyTransferLimit != null ? String(template.dailyTransferLimit) : ""
      )
    } else {
      setSelection({ kind: "custom" })
      setInstitution("")
      setType("")
      setInterestRate("")
      setCreditingFrequency("none")
      setCreditingTiming("")
      setCompounding(false)
      setPdicInsured(false)
      setMaintainingBalance("")
      setInterestCap("")
      setRequiredAdb("")
      setMonthlyFee("")
      setFreeTransfersPerMonth("")
      setInstapayFee("")
      setPesonetFee("")
      setDailyTransferLimit("")
    }
    setStep("details")
  }

  const typeOptions = selection?.kind === "template" ? selection.template.allowedTypes : ALL_TYPES
  const canSubmit = institution.trim() !== "" && type !== "" && accountNumber.trim() !== ""

  async function handleSubmit() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const input: NewAccountInput = {
        templateId: selection?.kind === "template" ? selection.template.id : null,
        institution: institution.trim(),
        type: type as BankAccount["type"],
        accountNumber: accountNumber.trim(),
        nickname: nickname.trim() || undefined,
        balance: balance ? Number(balance) : 0,
        pdicInsured,
        interestRate: interestRate ? Number(interestRate) : null,
        creditingFrequency,
        creditingTiming: creditingTiming || null,
        compounding,
        maintainingBalance: maintainingBalance ? Number(maintainingBalance) : null,
        requiredAdb: requiredAdb ? Number(requiredAdb) : null,
        interestCap: interestCap ? Number(interestCap) : null,
        monthlyFee: monthlyFee ? Number(monthlyFee) : null,
        freeTransfersPerMonth: freeTransfersPerMonth ? Number(freeTransfersPerMonth) : null,
        instapayFee: instapayFee ? Number(instapayFee) : null,
        pesonetFee: pesonetFee ? Number(pesonetFee) : null,
        dailyTransferLimit: dailyTransferLimit ? Number(dailyTransferLimit) : null,
      }
      await onAdd(input)
      // Success: parent closes the dialog via onOpenChange, which triggers resetAll.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't link account — try again")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-md", step === "details" && "sm:max-w-lg")}>
        <DialogHeader>
          <DialogTitle>
            {step === "institution"
              ? "Link an account"
              : selection?.kind === "template"
                ? selection.template.name
                : "Custom institution"}
          </DialogTitle>
          <DialogDescription>
            {step === "institution"
              ? "Choose a Philippine bank, digital bank, or e-wallet to prefill account details."
              : "Review the prefilled details, then link the account."}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait" initial={false}>
          {step === "institution" && (
            <motion.div
              key="institution"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <InstitutionPicker onSelect={handleChooseTemplate} />
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
                onClick={() => setStep("institution")}
                className="flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ChevronLeftIcon className="size-3.5" />
                Choose a different institution
              </button>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Institution name">
                  <Input
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. BPI"
                    disabled={selection?.kind === "template"}
                  />
                </Field>
                <Field label="Account type">
                  <Select value={type} onValueChange={(v) => v && setType(v as BankAccount["type"])}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type">
                        {(v: BankAccount["type"] | "") => (v ? TYPE_LABELS[v] : "Select type")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Account nickname (optional)">
                  <Input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder={`${institution || "Institution"} ${type ? TYPE_LABELS[type] : ""}`.trim()}
                  />
                </Field>
                <Field label="Account number">
                  <Input
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Last 4 digits are kept"
                  />
                </Field>
              </div>

              <Field label="Opening balance (₱)">
                <Input
                  type="number"
                  min={0}
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                />
              </Field>

              <div className="rounded-lg border p-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Interest</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Rate (% p.a.)">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      placeholder="0.00"
                    />
                  </Field>
                  <Field label="Credited">
                    <Select
                      value={creditingFrequency}
                      onValueChange={(v) => v && setCreditingFrequency(v as CreditingFrequency)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {(v: CreditingFrequency) => FREQUENCY_LABELS[v]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                {creditingFrequency !== "none" && (
                  <div className="mt-3">
                    <Field label="Timing">
                      <Select
                        value={creditingTiming}
                        onValueChange={(v) => v && setCreditingTiming(v as CreditingTiming)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="When during the day">
                            {(v: CreditingTiming | "") => (v ? TIMING_LABELS[v] : "When during the day")}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {TIMING_OPTIONS.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={compounding} onCheckedChange={setCompounding} size="sm" />
                    <span className="text-xs text-muted-foreground">Compounding</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={pdicInsured} onCheckedChange={setPdicInsured} size="sm" />
                    <span className="text-xs text-muted-foreground">PDIC insured</span>
                  </div>
                </div>
                {selection?.kind === "template" && selection.template.note && (
                  <p className="mt-3 text-xs text-muted-foreground">{selection.template.note}</p>
                )}
                {selection?.kind === "template" && selection.template.interestRate != null && (
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Prefilled from published headline rates — edit to match your actual account.
                  </p>
                )}
              </div>

              <Collapsible open={feesOpen} onOpenChange={setFeesOpen}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-3 text-left">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Fees &amp; transfer limits
                  </span>
                  <ChevronDownIcon
                    className={cn(
                      "size-4 text-muted-foreground transition-transform",
                      feesOpen && "rotate-180"
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 grid grid-cols-2 gap-3 rounded-lg border p-3">
                  <Field label="Maintaining balance (₱)">
                    <Input
                      type="number"
                      min={0}
                      value={maintainingBalance}
                      onChange={(e) => setMaintainingBalance(e.target.value)}
                    />
                  </Field>
                  <Field label="Required ADB (₱)">
                    <Input
                      type="number"
                      min={0}
                      value={requiredAdb}
                      onChange={(e) => setRequiredAdb(e.target.value)}
                    />
                  </Field>
                  <Field label="Interest cap (₱)">
                    <Input
                      type="number"
                      min={0}
                      value={interestCap}
                      onChange={(e) => setInterestCap(e.target.value)}
                    />
                  </Field>
                  <Field label="Monthly fee (₱)">
                    <Input
                      type="number"
                      min={0}
                      value={monthlyFee}
                      onChange={(e) => setMonthlyFee(e.target.value)}
                    />
                  </Field>
                  <Field label="Free transfers / month">
                    <Input
                      type="number"
                      min={0}
                      value={freeTransfersPerMonth}
                      onChange={(e) => setFreeTransfersPerMonth(e.target.value)}
                    />
                  </Field>
                  <Field label="Daily transfer limit (₱)">
                    <Input
                      type="number"
                      min={0}
                      value={dailyTransferLimit}
                      onChange={(e) => setDailyTransferLimit(e.target.value)}
                    />
                  </Field>
                  <Field label="InstaPay fee (₱)">
                    <Input
                      type="number"
                      min={0}
                      value={instapayFee}
                      onChange={(e) => setInstapayFee(e.target.value)}
                    />
                  </Field>
                  <Field label="PESONet fee (₱)">
                    <Input
                      type="number"
                      min={0}
                      value={pesonetFee}
                      onChange={(e) => setPesonetFee(e.target.value)}
                    />
                  </Field>
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
                      Linking…
                    </>
                  ) : (
                    "Link account"
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
