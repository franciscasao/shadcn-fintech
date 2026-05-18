"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2Icon } from "lucide-react"
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

interface ChangePasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [saving, setSaving] = useState(false)

  const passwordsMismatch = next.length > 0 && confirm.length > 0 && next !== confirm
  const canSubmit =
    current.length >= 1 && next.length >= 8 && confirm === next && !saving

  function reset() {
    setCurrent("")
    setNext("")
    setConfirm("")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      onOpenChange(false)
      toast.success("Password updated", {
        description: "You'll stay signed in on this device.",
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
          <DialogTitle>Update password</DialogTitle>
          <DialogDescription>
            Use 8+ characters with a mix of letters, numbers, and symbols.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="cpw">
              Current password
            </label>
            <Input
              id="cpw"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="npw">
              New password
            </label>
            <Input
              id="npw"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="cpw2">
              Confirm new password
            </label>
            <Input
              id="cpw2"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {passwordsMismatch && (
              <p className="text-[11px] text-rose-500">Passwords don&apos;t match.</p>
            )}
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
              {saving ? "Updating..." : "Update password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
