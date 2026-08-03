"use client"

import { useState } from "react"
import { PlusIcon, CheckIcon, LoaderIcon } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

import type { BankAccount } from "@/lib/types"

export type NewAccountInput = {
  institution: string
  type: BankAccount["type"]
  accountNumber: string
}

interface AddAccountProps {
  onAdd: (input: NewAccountInput) => Promise<void>
}

type Step = "idle" | "form" | "loading" | "success" | "error"

const accountTypes = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "crypto", label: "Crypto" },
  { value: "investment", label: "Investment" },
] as const

export function AddAccount({ onAdd }: AddAccountProps) {
  const [step, setStep] = useState<Step>("idle")
  const [institution, setInstitution] = useState("")
  const [accountType, setAccountType] = useState("")
  const [accountNumber, setAccountNumber] = useState("")

  async function handleConnect() {
    if (!institution || !accountType || !accountNumber) return

    setStep("loading")
    try {
      await onAdd({
        institution,
        type: accountType as BankAccount["type"],
        accountNumber,
      })
      setStep("success")
      setTimeout(() => {
        setStep("idle")
        setInstitution("")
        setAccountType("")
        setAccountNumber("")
      }, 1500)
    } catch {
      setStep("error")
      setTimeout(() => setStep("form"), 1500)
    }
  }

  return (
    <Card
      className={cn(
        "flex min-h-[180px] items-center justify-center border-2 border-dashed ring-0 transition-colors",
        step === "idle" && "cursor-pointer hover:border-primary/40 hover:bg-muted/30"
      )}
      onClick={() => step === "idle" && setStep("form")}
    >
      <CardContent className="flex w-full flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {step === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 text-muted-foreground"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                <PlusIcon className="size-5" />
              </div>
              <span className="text-sm font-medium">Link New Account</span>
            </motion.div>
          )}

          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex w-full flex-col gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <Input
                placeholder="Institution name"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
              />
              <Select
                value={accountType}
                onValueChange={(v) => v && setAccountType(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Account type" />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setStep("idle")
                    setInstitution("")
                    setAccountType("")
                    setAccountNumber("")
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!institution || !accountType || !accountNumber}
                  onClick={handleConnect}
                >
                  Connect
                </Button>
              </div>
            </motion.div>
          )}

          {step === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 text-muted-foreground"
            >
              <LoaderIcon className="size-6 animate-spin" />
              <span className="text-sm">Connecting...</span>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 text-emerald-500"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckIcon className="size-5" />
              </div>
              <span className="text-sm font-medium">Connected!</span>
            </motion.div>
          )}

          {step === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 text-destructive"
            >
              <span className="text-sm font-medium">
                Couldn&apos;t connect — try again
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
