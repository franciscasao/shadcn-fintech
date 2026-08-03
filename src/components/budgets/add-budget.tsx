"use client"

import { useState } from "react"
import { PlusIcon, CheckIcon, LoaderIcon } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BUDGET_ICONS, budgetIconMap } from "@/components/budgets/budget-icons"

export type NewBudgetInput = {
  category: string
  budget: number
  iconName: string
}

interface AddBudgetProps {
  onAdd: (input: NewBudgetInput) => Promise<void>
}

type Step = "idle" | "form" | "loading" | "success" | "error"

export function AddBudget({ onAdd }: AddBudgetProps) {
  const [step, setStep] = useState<Step>("idle")
  const [category, setCategory] = useState("")
  const [budget, setBudget] = useState("")
  const [iconName, setIconName] = useState("")

  function reset() {
    setCategory("")
    setBudget("")
    setIconName("")
  }

  async function handleAdd() {
    if (!category || !budget || !iconName) return

    setStep("loading")
    try {
      await onAdd({ category, budget: Number(budget), iconName })
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
        isForm ? "col-span-2 sm:col-span-4 p-4" : "gap-2",
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
            <span className="text-xs font-medium">Add Budget</span>
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
                placeholder="Category name"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                maxLength={24}
                className="sm:flex-1"
              />
              <Input
                type="number"
                placeholder="Monthly budget"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                min={1}
                className="sm:flex-1"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {BUDGET_ICONS.map((icon) => (
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
                  {budgetIconMap[icon.name]}
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
              <Button
                size="sm"
                className="flex-1"
                disabled={!category || !budget || !iconName}
                onClick={handleAdd}
              >
                Add Budget
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
            <span className="text-sm font-medium">Budget added!</span>
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
              Couldn&apos;t add budget — try again
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
