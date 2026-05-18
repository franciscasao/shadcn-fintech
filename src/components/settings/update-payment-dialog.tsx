"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CreditCardIcon, Loader2Icon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface UpdatePaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatCard(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4)
  if (digits.length < 3) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export function UpdatePaymentDialog({ open, onOpenChange }: UpdatePaymentDialogProps) {
  const [number, setNumber] = useState("")
  const [name, setName] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvc, setCvc] = useState("")
  const [saving, setSaving] = useState(false)

  const cardDigits = number.replace(/\s/g, "")
  const canSubmit =
    cardDigits.length === 16 &&
    name.trim().length >= 2 &&
    expiry.length === 5 &&
    cvc.length >= 3 &&
    !saving

  function reset() {
    setNumber("")
    setName("")
    setExpiry("")
    setCvc("")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      onOpenChange(false)
      toast.success("Payment method updated", {
        description: `Card ending in ${cardDigits.slice(-4)} is now your default.`,
      })
      reset()
    }, 1200)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) reset()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update payment method</DialogTitle>
          <DialogDescription>
            Your card information is encrypted and never stored in plain text.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="num">
              Card number
            </label>
            <div className="relative">
              <CreditCardIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="num"
                value={number}
                onChange={(e) => setNumber(formatCard(e.target.value))}
                placeholder="1234 5678 9012 3456"
                inputMode="numeric"
                className="pl-9 tabular-nums"
                autoFocus
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="nm">
              Name on card
            </label>
            <Input
              id="nm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ALEX MORGAN"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="exp">
                Expiry
              </label>
              <Input
                id="exp"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY"
                inputMode="numeric"
                className="tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="cvc">
                CVC
              </label>
              <Input
                id="cvc"
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="123"
                inputMode="numeric"
                className="tabular-nums"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {saving && <Loader2Icon className="size-4 animate-spin" />}
              {saving ? "Saving..." : "Save card"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
