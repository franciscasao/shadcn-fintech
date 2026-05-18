"use client"

import { useState } from "react"
import { toast } from "sonner"
import { format, addBusinessDays } from "date-fns"
import {
  CalendarIcon,
  RepeatIcon,
  Loader2Icon,
} from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { contacts, bankAccounts, type TransferRecord, type TransferFrequency } from "@/data/seed"

interface ScheduleTransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSchedule: (record: TransferRecord) => void
}

const frequencyLabel: Record<TransferFrequency, string> = {
  "one-time": "One-time",
  "weekly": "Weekly",
  "bi-weekly": "Bi-weekly",
  "monthly": "Monthly",
}

export function ScheduleTransferDialog({
  open,
  onOpenChange,
  onSchedule,
}: ScheduleTransferDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <ScheduleTransferDialogInner
          onClose={() => onOpenChange(false)}
          onSchedule={onSchedule}
        />
      )}
    </Dialog>
  )
}

function ScheduleTransferDialogInner({
  onClose,
  onSchedule,
}: {
  onClose: () => void
  onSchedule: (record: TransferRecord) => void
}) {
  const [fromAccount, setFromAccount] = useState(bankAccounts[0].id)
  const [recipient, setRecipient] = useState(contacts[0].id)
  const [amount, setAmount] = useState("")
  const [frequency, setFrequency] = useState<TransferFrequency>("monthly")
  const [startDate, setStartDate] = useState<Date | undefined>(() => addBusinessDays(new Date(), 1))
  const [memo, setMemo] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const recipientContact = contacts.find((c) => c.id === recipient)
  const accountChoice = bankAccounts.find((a) => a.id === fromAccount)
  const canSubmit =
    !!recipientContact &&
    !!accountChoice &&
    !!startDate &&
    parseFloat(amount) > 0 &&
    !submitting

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || !recipientContact || !startDate) return
    setSubmitting(true)
    setTimeout(() => {
      const record: TransferRecord = {
        id: `tr-${Date.now()}`,
        type: "scheduled",
        contactName: recipientContact.name,
        contactAvatar: recipientContact.avatar,
        amount: parseFloat(amount),
        date: format(startDate, "MMM dd, yyyy"),
        status: "scheduled",
        note: memo || undefined,
        frequency,
      }
      onSchedule(record)
      setSubmitting(false)
      onClose()
      toast.success("Transfer scheduled", {
        description: `${frequencyLabel[frequency]} · starts ${format(startDate, "MMM d")}`,
      })
    }, 900)
  }

  return (
    <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RepeatIcon className="size-4 text-primary" />
            Schedule a transfer
          </DialogTitle>
          <DialogDescription>
            Send money now or on a recurring schedule.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* From */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">From account</label>
            <Select value={fromAccount} onValueChange={(v) => v && setFromAccount(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} ({a.accountNumber}) · {a.currency}
                    {a.balance.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recipient */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Recipient</label>
            <Select value={recipient} onValueChange={(v) => v && setRecipient(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a contact" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {recipientContact && (
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5">
                <Avatar className="size-6">
                  <AvatarImage src={recipientContact.avatar} alt={recipientContact.name} />
                  <AvatarFallback className="text-[10px]">
                    {recipientContact.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs">{recipientContact.name}</span>
              </div>
            )}
          </div>

          {/* Amount + Frequency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="amount">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7 tabular-nums"
                  placeholder="500.00"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Frequency</label>
              <Select value={frequency} onValueChange={(v) => v && setFrequency(v as TransferFrequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-time">One-time</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Start date */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">
              {frequency === "one-time" ? "Send on" : "Starts on"}
            </label>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground",
                    )}
                  />
                }
              >
                <CalendarIcon className="mr-2 size-3.5" />
                {startDate ? format(startDate, "EEE, MMM d, yyyy") : "Pick a date"}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Memo */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="memo">
              Memo <span className="text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="memo"
              rows={2}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="What's this for?"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting && <Loader2Icon className="size-4 animate-spin" />}
              {submitting ? "Scheduling..." : "Schedule transfer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
  )
}
