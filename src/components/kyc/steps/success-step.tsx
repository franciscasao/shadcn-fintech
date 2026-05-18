"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { CheckCircle2Icon, ClockIcon, MailIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SuccessStep() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-xl space-y-6 py-6 text-center"
    >
      <motion.div
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.1 }}
        className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500"
      >
        <CheckCircle2Icon className="size-10" />
      </motion.div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Submitted for review
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Thanks. We&apos;ll review your information and get back to you within 24 to 48 hours.
        </p>
      </div>

      <div className="space-y-2 rounded-xl border bg-card p-4 text-left">
        <div className="flex items-center gap-3">
          <ClockIcon className="size-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Estimated review time</p>
            <p className="text-xs text-muted-foreground">24 to 48 hours</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <MailIcon className="size-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">We&apos;ll email you</p>
            <p className="text-xs text-muted-foreground">As soon as your verification is complete</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button size="lg" render={<Link href="/dashboard" />}>
          Back to dashboard
        </Button>
        <Button variant="ghost" size="sm" render={<Link href="/support" />}>
          Have questions? Contact support
        </Button>
      </div>
    </motion.div>
  )
}
