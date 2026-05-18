"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckIcon, SparklesIcon, BuildingIcon, ZapIcon, Loader2Icon } from "lucide-react"
import { motion } from "motion/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PlanId = "pro-monthly" | "pro-yearly" | "business"

const plans: {
  id: PlanId
  name: string
  price: string
  period: string
  icon: React.ReactNode
  features: string[]
  badge?: string
}[] = [
  {
    id: "pro-monthly",
    name: "Pro",
    price: "$12",
    period: "/month",
    icon: <SparklesIcon className="size-4" />,
    features: ["Unlimited cards", "AI insights", "Priority support"],
  },
  {
    id: "pro-yearly",
    name: "Pro Yearly",
    price: "$120",
    period: "/year",
    icon: <ZapIcon className="size-4" />,
    features: ["Everything in Pro", "2 months free", "Annual report"],
    badge: "Save 17%",
  },
  {
    id: "business",
    name: "Business",
    price: "$49",
    period: "/month",
    icon: <BuildingIcon className="size-4" />,
    features: ["Multi-user", "API access", "Dedicated account manager"],
  },
]

interface UpgradePlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UpgradePlanDialog({ open, onOpenChange }: UpgradePlanDialogProps) {
  const [selected, setSelected] = useState<PlanId>("pro-yearly")
  const [processing, setProcessing] = useState(false)

  function handleConfirm() {
    setProcessing(true)
    setTimeout(() => {
      setProcessing(false)
      onOpenChange(false)
      const plan = plans.find((p) => p.id === selected)
      toast.success(`Welcome to Vault ${plan?.name}!`, {
        description: "Your plan starts immediately.",
      })
    }, 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose a plan</DialogTitle>
          <DialogDescription>
            All plans include a 14-day money-back guarantee.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5">
          {plans.map((plan) => {
            const isSelected = selected === plan.id
            return (
              <motion.button
                key={plan.id}
                type="button"
                onClick={() => setSelected(plan.id)}
                whileTap={{ scale: 0.99 }}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "hover:bg-muted/50",
                )}
              >
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {plan.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{plan.name}</p>
                    {plan.badge && (
                      <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {plan.features.join(" · ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums">{plan.price}</p>
                  <p className="text-[11px] text-muted-foreground">{plan.period}</p>
                </div>
                {isSelected && (
                  <motion.div
                    layoutId="plan-check"
                    className="absolute"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <CheckIcon className="size-3.5 text-primary" />
                  </motion.div>
                )}
              </motion.button>
            )
          })}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={processing}>
            {processing && <Loader2Icon className="size-4 animate-spin" />}
            {processing ? "Processing..." : "Confirm upgrade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
