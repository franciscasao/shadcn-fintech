"use client"

import { motion } from "motion/react"
import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type KycStepperStep = {
  id: string
  label: string
}

interface KycStepperProps {
  steps: KycStepperStep[]
  current: string
}

export function KycStepper({ steps, current }: KycStepperProps) {
  const currentIdx = steps.findIndex((s) => s.id === current)

  return (
    <div className="relative">
      {/* Connecting line track */}
      <div className="absolute left-4 right-4 top-3.5 h-px bg-muted" aria-hidden />
      {/* Progress fill */}
      <motion.div
        className="absolute left-4 top-3.5 h-px bg-primary"
        initial={false}
        animate={{
          width: `calc((100% - 2rem) * ${currentIdx / Math.max(steps.length - 1, 1)})`,
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />

      <ol className="relative flex justify-between">
        {steps.map((s, i) => {
          const completed = i < currentIdx
          const active = i === currentIdx
          return (
            <li key={s.id} className="flex flex-col items-center gap-1.5">
              <motion.div
                animate={{
                  scale: active ? 1.05 : 1,
                  backgroundColor:
                    completed || active
                      ? "var(--color-primary)"
                      : "var(--color-muted)",
                }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "relative flex size-7 items-center justify-center rounded-full text-[11px] font-semibold ring-4 ring-background",
                  completed || active
                    ? "text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {completed ? <CheckIcon className="size-3.5" /> : i + 1}
              </motion.div>
              <span
                className={cn(
                  "text-[10px] font-medium uppercase tracking-wide transition-colors hidden sm:inline",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
