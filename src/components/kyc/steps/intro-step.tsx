"use client"

import { motion } from "motion/react"
import {
  ShieldCheckIcon,
  ClockIcon,
  FileBadgeIcon,
  UserCheckIcon,
  ArrowRightIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface IntroStepProps {
  onStart: () => void
}

const requirements = [
  {
    icon: <FileBadgeIcon className="size-4" />,
    label: "Government-issued ID",
    desc: "Passport, driver's license, or national ID card",
  },
  {
    icon: <UserCheckIcon className="size-4" />,
    label: "A quick selfie",
    desc: "We'll verify you match your ID",
  },
  {
    icon: <ClockIcon className="size-4" />,
    label: "3 minutes",
    desc: "Reviews complete within 24 to 48 hours",
  },
]

export function IntroStep({ onStart }: IntroStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-xl space-y-8 py-6"
    >
      <div className="space-y-4 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
          className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"
        >
          <ShieldCheckIcon className="size-8" />
        </motion.div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Let&apos;s verify your identity
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Required by financial regulations to unlock transfers and crypto features.
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {requirements.map((r, i) => (
          <motion.div
            key={r.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
            className="flex items-start gap-3 rounded-xl border bg-card p-4"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {r.icon}
            </div>
            <div>
              <p className="text-sm font-medium">{r.label}</p>
              <p className="text-xs text-muted-foreground">{r.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="space-y-3">
        <Button size="lg" className="w-full gap-2" onClick={onStart}>
          Begin verification
          <ArrowRightIcon className="size-4" />
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          Your data is encrypted and never shared without your consent.
        </p>
      </div>
    </motion.div>
  )
}
