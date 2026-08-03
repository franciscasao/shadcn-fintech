"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { LoaderIcon, CopyIcon, CheckIcon, PlusIcon } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Step = "idle" | "form" | "loading" | "success"

export type NewVirtualCardInput = {
  name: string
  monthlyLimit?: number
}

interface VirtualCardGeneratorProps {
  onCardCreated: (input: NewVirtualCardInput) => Promise<void>
}

// A locally-previewed card number/expiry/cvv shown in the success panel —
// cosmetic only; the server mints the real values independently on create.
function randomDigits(n: number): string {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join(
    "",
  )
}

function buildPreview(name: string, limit: string) {
  const last4 = randomDigits(4)
  return {
    name: name.trim(),
    cardNumber: `${randomDigits(4)} ${randomDigits(4)} ${randomDigits(4)} ${last4}`,
    expiry: `${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}/${String(new Date().getFullYear() + 3).slice(-2)}`,
    cvv: randomDigits(3),
    monthlyLimit: Number(limit) || 3000,
  }
}

export function VirtualCardGenerator({
  onCardCreated,
}: VirtualCardGeneratorProps) {
  const [step, setStep] = useState<Step>("idle")
  const [name, setName] = useState("")
  const [limit, setLimit] = useState("")
  const [newCard, setNewCard] = useState<ReturnType<typeof buildPreview> | null>(null)
  const [copied, setCopied] = useState(false)

  const reset = useCallback(() => {
    setStep("idle")
    setName("")
    setLimit("")
    setNewCard(null)
    setCopied(false)
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!name.trim()) return
    setStep("loading")

    const preview = buildPreview(name, limit)
    try {
      await onCardCreated({ name: preview.name, monthlyLimit: preview.monthlyLimit })
      setNewCard(preview)
      setStep("success")
      setTimeout(() => {
        reset()
      }, 4000)
    } catch {
      setStep("form")
    }
  }, [name, limit, onCardCreated, reset])

  const handleCopy = useCallback(() => {
    if (!newCard) return
    navigator.clipboard.writeText(newCard.cardNumber.replace(/\s/g, ""))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [newCard])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Virtual Card</CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {/* ── Idle ── */}
          {step === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <p className="mb-4 text-sm text-muted-foreground">
                Create a disposable virtual card for online purchases.
              </p>
              <Button onClick={() => setStep("form")} className="w-full">
                <PlusIcon className="size-4" />
                Create Virtual Card
              </Button>
            </motion.div>
          )}

          {/* ── Form ── */}
          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Card Name
                </label>
                <Input
                  placeholder="e.g. Netflix Sub"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Monthly Limit (₱)
                </label>
                <Input
                  type="number"
                  placeholder="3000"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={reset}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={!name.trim()}
                  onClick={handleGenerate}
                >
                  Generate
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
              className="flex flex-col items-center gap-3 py-6"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <LoaderIcon className="size-6 text-muted-foreground" />
              </motion.div>
              <span className="text-sm text-muted-foreground">
                Generating...
              </span>
            </motion.div>
          )}

          {/* ── Success ── */}
          {step === "success" && newCard && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="mb-1 text-xs text-muted-foreground">
                  Card Number
                </p>
                <motion.p
                  className="font-mono text-sm font-medium tabular-nums"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6 }}
                >
                  {newCard.cardNumber}
                </motion.p>
                <div className="mt-2 flex gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Exp</p>
                    <p className="text-xs font-medium tabular-nums">
                      {newCard.expiry}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CVV</p>
                    <p className="text-xs font-medium tabular-nums">
                      {newCard.cvv}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopy()
                }}
              >
                {copied ? (
                  <>
                    <CheckIcon className="size-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <CopyIcon className="size-3.5" />
                    Copy Number
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
