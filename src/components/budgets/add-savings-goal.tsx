"use client"

import { useState } from "react"
import { PlusIcon, CheckIcon, LoaderIcon } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SAVINGS_GOAL_ICONS, savingsGoalIconMap } from "@/components/budgets/savings-goal-icons"

export type NewSavingsGoalInput = {
  name: string
  targetAmount: number
  deadline: string
  iconName: string
  monthlyContribution: number
}

interface AddSavingsGoalProps {
  onAdd: (input: NewSavingsGoalInput) => Promise<void>
}

type Step = "idle" | "form" | "loading" | "success" | "error"

export function AddSavingsGoal({ onAdd }: AddSavingsGoalProps) {
  const [step, setStep] = useState<Step>("idle")
  const [name, setName] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [deadline, setDeadline] = useState("")
  const [monthlyContribution, setMonthlyContribution] = useState("")
  const [iconName, setIconName] = useState("")

  function reset() {
    setName("")
    setTargetAmount("")
    setDeadline("")
    setMonthlyContribution("")
    setIconName("")
  }

  const canSubmit =
    name.trim().length > 0 &&
    Number(targetAmount) > 0 &&
    deadline !== "" &&
    monthlyContribution !== "" &&
    Number(monthlyContribution) >= 0 &&
    iconName !== ""

  async function handleAdd() {
    if (!canSubmit) return

    setStep("loading")
    try {
      // deadline comes from <input type="month"> as "YYYY-MM" — reformat to
      // match the "MMM yyyy" label the rest of the UI displays (see
      // savings-goals.tsx and fixtures.ts).
      const deadlineLabel = format(new Date(`${deadline}-01T00:00:00`), "MMM yyyy")
      await onAdd({
        name: name.trim(),
        targetAmount: Number(targetAmount),
        deadline: deadlineLabel,
        iconName,
        monthlyContribution: Number(monthlyContribution),
      })
      setStep("success")
      setTimeout(() => {
        setStep("idle")
        reset()
      }, 1500)
    } catch {
      setStep("error")
      setTimeout(() => setStep("form"), 1500)
    }
  }

  const isForm = step === "form" || step === "loading" || step === "success" || step === "error"

  return (
    <div
      className={cn(
        "flex min-h-[132px] flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
        isForm ? "col-span-full p-4" : "gap-2",
        step === "idle" && "cursor-pointer hover:border-primary/40 hover:bg-muted/30"
      )}
      onClick={() => step === "idle" && setStep("form")}
    >
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
            <span className="text-xs font-medium">Add Savings Goal</span>
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
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                autoFocus
                placeholder="Goal name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                className="sm:flex-1"
              />
              <Input
                type="number"
                placeholder="Target amount"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                min={1}
                className="sm:flex-1"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                type="number"
                placeholder="Monthly contribution"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
                min={0}
                className="sm:flex-1"
              />
              <Input
                type="month"
                aria-label="Target month"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="sm:flex-1"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {SAVINGS_GOAL_ICONS.map((icon) => (
                <button
                  key={icon.name}
                  type="button"
                  aria-label={icon.label}
                  onClick={() => setIconName(icon.name)}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg border transition-colors",
                    iconName === icon.name
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {savingsGoalIconMap[icon.name]}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setStep("idle")
                  reset()
                }}
              >
                Cancel
              </Button>
              <Button size="sm" className="flex-1" disabled={!canSubmit} onClick={handleAdd}>
                Add Goal
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
            <span className="text-sm">Adding...</span>
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
            <span className="text-sm font-medium">Goal added!</span>
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
              Couldn&apos;t add goal — try again
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
