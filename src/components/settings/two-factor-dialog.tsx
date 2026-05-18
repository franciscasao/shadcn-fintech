"use client"

import { useState, useRef, useMemo } from "react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "motion/react"
import {
  CopyIcon,
  CheckIcon,
  ShieldCheckIcon,
  DownloadIcon,
  Loader2Icon,
  ArrowLeftIcon,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Step = "scan" | "verify" | "backup" | "success"

const MANUAL_KEY = "JBSWY3DPEHPK3PXP"
const APP_NAME = "Vault"
const ACCOUNT = "alex@vault.app"

// ── Fake QR code: deterministic 25x25 grid + corner finder patterns ─────────
function FakeQrCode({ size = 160 }: { size?: number }) {
  const GRID = 25
  const cellPx = size / GRID

  const cells = useMemo(() => {
    // Per-cell deterministic hash → boolean. No closure mutation.
    function bit(r: number, c: number): boolean {
      const h = ((r * 73856093) ^ (c * 19349663)) >>> 0
      return (h % 1000) / 1000 > 0.55
    }
    // Carve out the 3 finder-pattern regions
    function inFinder(r: number, c: number): boolean {
      return (
        (r < 8 && c < 8) ||
        (r < 8 && c >= GRID - 7) ||
        (r >= GRID - 7 && c < 8)
      )
    }
    return Array.from({ length: GRID }, (_, r) =>
      Array.from({ length: GRID }, (_, c) => !inFinder(r, c) && bit(r, c)),
    )
  }, [])

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="QR code"
      className="rounded-lg bg-white p-2"
    >
      <rect width={size} height={size} fill="white" />
      {/* Data cells */}
      {cells.map((row, r) =>
        row.map((on, c) =>
          on ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellPx}
              y={r * cellPx}
              width={cellPx}
              height={cellPx}
              fill="black"
            />
          ) : null,
        ),
      )}
      {/* Finder patterns: 7x7 outer black, 5x5 white inset, 3x3 black core */}
      {(
        [
          [0, 0],
          [0, (GRID - 7) * cellPx],
          [(GRID - 7) * cellPx, 0],
        ] as [number, number][]
      ).map(([y, x], i) => (
        <g key={i}>
          <rect x={x} y={y} width={7 * cellPx} height={7 * cellPx} fill="black" />
          <rect
            x={x + cellPx}
            y={y + cellPx}
            width={5 * cellPx}
            height={5 * cellPx}
            fill="white"
          />
          <rect
            x={x + 2 * cellPx}
            y={y + 2 * cellPx}
            width={3 * cellPx}
            height={3 * cellPx}
            fill="black"
          />
        </g>
      ))}
    </svg>
  )
}

// ── OTP input: 6 boxes that auto-advance ───────────────────────────────────
function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = value.padEnd(6, " ").split("").slice(0, 6)

  function setDigit(idx: number, d: string) {
    const clean = d.replace(/\D/g, "").slice(-1)
    const next = digits.slice()
    next[idx] = clean || " "
    onChange(next.join("").trimEnd())
    if (clean && idx < 5) refs.current[idx + 1]?.focus()
  }

  function handleKey(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[idx].trim() && idx > 0) {
      refs.current[idx - 1]?.focus()
    } else if (e.key === "ArrowLeft" && idx > 0) {
      refs.current[idx - 1]?.focus()
    } else if (e.key === "ArrowRight" && idx < 5) {
      refs.current[idx + 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    onChange(pasted)
    refs.current[Math.min(pasted.length, 5)]?.focus()
  }

  return (
    <div className="flex justify-center gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="size-11 rounded-lg border bg-background text-center text-lg font-semibold tabular-nums shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
        />
      ))}
    </div>
  )
}

function generateBackupCodes(): string[] {
  // Deterministic enough — built once at dialog mount.
  const chars = "0123456789abcdef"
  return Array.from({ length: 8 }, () =>
    Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)])
      .join("")
      .replace(/(.{5})(.{5})/, "$1-$2"),
  )
}

interface TwoFactorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
  onCancel: () => void
}

export function TwoFactorDialog({
  open,
  onOpenChange,
  onComplete,
  onCancel,
}: TwoFactorDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        // base-ui only fires this when closing (no internal trigger).
        // If the user cancels mid-flow, hand back to parent.
        if (!o) onCancel()
        onOpenChange(o)
      }}
    >
      {open && (
        <TwoFactorDialogInner
          onClose={() => onOpenChange(false)}
          onComplete={onComplete}
        />
      )}
    </Dialog>
  )
}

function TwoFactorDialogInner({
  onClose,
  onComplete,
}: {
  onClose: () => void
  onComplete: () => void
}) {
  const [step, setStep] = useState<Step>("scan")
  const [copied, setCopied] = useState(false)
  const [otp, setOtp] = useState("")
  const [verifying, setVerifying] = useState(false)
  const backupCodes = useMemo(() => generateBackupCodes(), [])
  const successTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  function copyKey() {
    navigator.clipboard.writeText(MANUAL_KEY)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function verify() {
    if (otp.length !== 6) return
    setVerifying(true)
    setTimeout(() => {
      setVerifying(false)
      setStep("backup")
    }, 1000)
  }

  function downloadCodes() {
    const text = `Vault Backup Codes\nGenerated ${new Date().toLocaleString()}\nAccount: ${ACCOUNT}\n\n${backupCodes.join("\n")}\n\nKeep these somewhere safe. Each can be used once.`
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "vault-backup-codes.txt"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function finishBackup() {
    setStep("success")
    successTimeout.current = setTimeout(() => {
      onComplete()
      onClose()
      toast.success("Two-factor authentication enabled", {
        description: "You'll be asked for a code on your next sign-in.",
      })
    }, 1300)
  }

  return (
    <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="size-4 text-primary" />
            Set up two-factor authentication
          </DialogTitle>
          <DialogDescription>
            {step === "scan" && "Scan this QR code with your authenticator app."}
            {step === "verify" && "Enter the 6-digit code from your authenticator app."}
            {step === "backup" && "Save these codes somewhere safe."}
            {step === "success" && "You're all set."}
          </DialogDescription>
        </DialogHeader>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5">
          {(["scan", "verify", "backup"] as const).map((s, i) => {
            const stepIdx = ["scan", "verify", "backup", "success"].indexOf(step)
            const active = i <= stepIdx
            return (
              <span
                key={s}
                className={cn(
                  "h-1 w-8 rounded-full transition-colors",
                  active ? "bg-primary" : "bg-muted",
                )}
              />
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* ── Scan ── */}
          {step === "scan" && (
            <motion.div
              key="scan"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="space-y-4"
            >
              <div className="flex justify-center">
                <FakeQrCode size={160} />
              </div>

              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Can&apos;t scan? Enter this key manually
                </p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <code className="font-mono text-xs tabular-nums">{MANUAL_KEY}</code>
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5" onClick={copyKey}>
                    {copied ? (
                      <>
                        <CheckIcon className="size-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <CopyIcon className="size-3" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Account: <span className="font-medium">{APP_NAME}:{ACCOUNT}</span>
                </p>
              </div>

              <Button className="w-full" onClick={() => setStep("verify")}>
                I&apos;ve added the key
              </Button>
            </motion.div>
          )}

          {/* ── Verify ── */}
          {step === "verify" && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="space-y-4"
            >
              <OtpInput value={otp} onChange={setOtp} disabled={verifying} />
              <p className="text-center text-[11px] text-muted-foreground">
                Codes refresh every 30 seconds.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setStep("scan")}
                  disabled={verifying}
                >
                  <ArrowLeftIcon className="size-3.5" />
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={verify}
                  disabled={otp.length !== 6 || verifying}
                >
                  {verifying && <Loader2Icon className="size-4 animate-spin" />}
                  {verifying ? "Verifying..." : "Verify"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Backup ── */}
          {step === "backup" && (
            <motion.div
              key="backup"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="space-y-4"
            >
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="grid grid-cols-2 gap-1.5">
                  {backupCodes.map((c) => (
                    <code
                      key={c}
                      className="rounded bg-background px-2 py-1.5 text-center font-mono text-xs tabular-nums shadow-sm"
                    >
                      {c}
                    </code>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Each code works once. Use them if you lose access to your authenticator.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadCodes} className="gap-1.5">
                  <DownloadIcon className="size-3.5" />
                  Download .txt
                </Button>
                <Button className="flex-1" onClick={finishBackup}>
                  I&apos;ve saved them
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Success ── */}
          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-3 py-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
                className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10"
              >
                <ShieldCheckIcon className="size-7 text-emerald-500" />
              </motion.div>
              <p className="text-sm font-semibold">2FA enabled</p>
              <p className="text-xs text-muted-foreground">Closing...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
  )
}

// ── Disable confirmation dialog ─────────────────────────────────────────────

export function DisableTwoFactorDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disable two-factor authentication?</DialogTitle>
          <DialogDescription>
            Your account will be less secure. You can re-enable 2FA any time from this page.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep enabled
          </Button>
          <Button
            variant="default"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
              toast.success("Two-factor authentication disabled")
            }}
          >
            Disable 2FA
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
