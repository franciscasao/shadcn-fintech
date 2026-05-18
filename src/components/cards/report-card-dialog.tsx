"use client"

import { useState } from "react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "motion/react"
import { addBusinessDays, format } from "date-fns"
import {
  AlertTriangleIcon,
  PackageIcon,
  ArrowLeftIcon,
  Loader2Icon,
  CheckCircle2Icon,
  ZapIcon,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { CardData } from "@/data/seed"

type Step = "reason" | "details" | "address" | "loading" | "success"

type Reason = "lost" | "stolen" | "damaged" | "never-received"

const reasons: { id: Reason; label: string; desc: string; tone: string }[] = [
  { id: "lost", label: "Lost", desc: "I can't find it", tone: "text-amber-500" },
  { id: "stolen", label: "Stolen", desc: "Someone took it", tone: "text-rose-500" },
  { id: "damaged", label: "Damaged", desc: "Card is broken or worn", tone: "text-muted-foreground" },
  { id: "never-received", label: "Never received", desc: "It never arrived", tone: "text-muted-foreground" },
]

interface ReportCardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: CardData
  onReported: (info: { reason: Reason; replacementDate: Date }) => void
}

export function ReportCardDialog({ open, onOpenChange, card, onReported }: ReportCardDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Inner mounts only when open=true so internal state always starts fresh. */}
      {open && (
        <ReportCardDialogInner
          card={card}
          onClose={() => onOpenChange(false)}
          onReported={onReported}
        />
      )}
    </Dialog>
  )
}

function ReportCardDialogInner({
  card,
  onClose,
  onReported,
}: {
  card: CardData
  onClose: () => void
  onReported: (info: { reason: Reason; replacementDate: Date }) => void
}) {
  const [step, setStep] = useState<Step>("reason")
  const [reason, setReason] = useState<Reason | null>(null)
  const [incidentDate, setIncidentDate] = useState("")
  const [note, setNote] = useState("")
  const [street, setStreet] = useState("550 Mission St, Apt 4B")
  const [city, setCity] = useState("San Francisco")
  const [zip, setZip] = useState("94105")
  const [country, setCountry] = useState("United States")
  const [rush, setRush] = useState(false)

  function submit() {
    if (!reason) return
    setStep("loading")
    setTimeout(() => {
      const days = rush ? 2 : 5
      const replacementDate = addBusinessDays(new Date(), days)
      setStep("success")
      setTimeout(() => {
        onReported({ reason, replacementDate })
        onClose()
        toast.success("Card reported", {
          description: `Replacement arrives ${format(replacementDate, "EEE, MMM d")}.`,
        })
      }, 1500)
    }, 1200)
  }

  const stepIdx = ["reason", "details", "address", "loading", "success"].indexOf(step)

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertTriangleIcon className="size-4 text-amber-500" />
          Report this card
        </DialogTitle>
        <DialogDescription>
          {card.name} &middot; **** {card.last4}
        </DialogDescription>
      </DialogHeader>

      {step !== "success" && step !== "loading" && (
        <div className="flex justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "h-1 w-8 rounded-full transition-colors",
                i <= stepIdx ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── Reason ── */}
        {step === "reason" && (
          <motion.div
            key="reason"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            className="space-y-2.5"
          >
            {reasons.map((r) => {
              const selected = reason === r.id
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setReason(r.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all",
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "hover:bg-muted/50",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                      selected ? "border-primary" : "border-muted-foreground/30",
                    )}
                  >
                    {selected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="size-2 rounded-full bg-primary"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={cn("text-sm font-medium", r.tone)}>{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.desc}</p>
                  </div>
                </button>
              )
            })}
            <div className="flex justify-end pt-1">
              <Button onClick={() => setStep("details")} disabled={!reason}>
                Continue
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Details ── */}
        {step === "details" && (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="inc-date">
                When did this happen? <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="inc-date"
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="note">
                Anything else we should know? <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. last used at a coffee shop on Mission St..."
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setStep("reason")}>
                <ArrowLeftIcon className="size-3.5" />
                Back
              </Button>
              <Button className="flex-1" onClick={() => setStep("address")}>
                Continue
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Address ── */}
        {step === "address" && (
          <motion.div
            key="address"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            className="space-y-3"
          >
            <p className="text-xs text-muted-foreground">
              Confirm where we should ship the replacement.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="street">Street address</label>
              <Input id="street" value={street} onChange={(e) => setStreet(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium" htmlFor="city">City</label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" htmlFor="zip">Postal code</label>
                <Input id="zip" value={zip} onChange={(e) => setZip(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="country">Country</label>
              <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>

            <button
              type="button"
              onClick={() => setRush(!rush)}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all",
                rush
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "hover:bg-muted/50",
              )}
            >
              <ZapIcon className={cn("mt-0.5 size-4 shrink-0", rush ? "text-primary" : "text-muted-foreground")} />
              <div className="flex-1">
                <p className="text-sm font-semibold">Rush delivery</p>
                <p className="text-xs text-muted-foreground">
                  Arrives in 2 business days &middot; <span className="font-medium">$15</span>
                </p>
              </div>
              <div className={cn("mt-1 size-4 rounded border-2", rush ? "border-primary bg-primary" : "border-muted-foreground/30")}>
                {rush && <CheckCircle2Icon className="size-3 text-primary-foreground" />}
              </div>
            </button>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setStep("details")}>
                <ArrowLeftIcon className="size-3.5" />
                Back
              </Button>
              <Button className="flex-1" onClick={submit}>
                Report &amp; ship replacement
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Loading ── */}
        {step === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 py-8"
          >
            <Loader2Icon className="size-7 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Reporting card and ordering replacement...</p>
          </motion.div>
        )}

        {/* ── Success ── */}
        {step === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 py-6 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
              className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10"
            >
              <PackageIcon className="size-7 text-emerald-500" />
            </motion.div>
            <div>
              <p className="text-sm font-semibold">Replacement ordered</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Your current card has been frozen.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </DialogContent>
  )
}
