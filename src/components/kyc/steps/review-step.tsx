"use client"

import { useState } from "react"
import { motion } from "motion/react"
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  PencilIcon,
  Loader2Icon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { KycData, KycStep } from "@/components/kyc/kyc-page-client"
import { cn } from "@/lib/utils"

interface ReviewStepProps {
  data: KycData
  onBack: () => void
  onJump: (step: KycStep) => void
  onSubmit: () => void
}

function Section({
  title,
  onEdit,
  children,
}: {
  title: string
  onEdit: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-xs"
          onClick={onEdit}
        >
          <PencilIcon className="size-3" />
          Edit
        </Button>
      </div>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-medium", !value && "italic text-muted-foreground")}>
        {value || "—"}
      </span>
    </div>
  )
}

export function ReviewStep({ data, onBack, onJump, onSubmit }: ReviewStepProps) {
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit() {
    setSubmitting(true)
    setTimeout(() => {
      onSubmit()
    }, 1300)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="space-y-4"
    >
      <div>
        <h2 className="text-lg font-semibold">Review and submit</h2>
        <p className="text-sm text-muted-foreground">
          Make sure everything looks right before you submit for review.
        </p>
      </div>

      <div className="space-y-3">
        <Section title="Personal" onEdit={() => onJump("personal")}>
          <Row label="Full name" value={data.fullName} />
          <Row label="Date of birth" value={data.dob} />
          <Row label="Nationality" value={data.nationality} />
          <Row label="Country of residence" value={data.residence} />
        </Section>

        <Section title="Address" onEdit={() => onJump("address")}>
          <Row
            label="Address"
            value={[data.street, data.city, data.state, data.postal, data.country]
              .filter(Boolean)
              .join(", ")}
          />
        </Section>

        <Section title="ID Document" onEdit={() => onJump("document")}>
          <Row
            label="Type"
            value={
              data.docType === "passport"
                ? "Passport"
                : data.docType === "driver-license"
                  ? "Driver's license"
                  : "National ID card"
            }
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">Front</span>
            <span className="flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2Icon className="size-3.5" />
              Uploaded
            </span>
          </div>
          {data.docType !== "passport" && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">Back</span>
              <span className="flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2Icon className="size-3.5" />
                Uploaded
              </span>
            </div>
          )}
        </Section>

        <Section title="Liveness check" onEdit={() => onJump("selfie")}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">Selfie</span>
            <span className="flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2Icon className="size-3.5" />
              Verified
            </span>
          </div>
        </Section>
      </div>

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-amber-700 dark:text-amber-400">
        By submitting, you confirm everything you provided is accurate. Submitting false
        information may result in account suspension.
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={onBack}
          disabled={submitting}
        >
          <ArrowLeftIcon className="size-3.5" />
          Back
        </Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
          {submitting && <Loader2Icon className="size-4 animate-spin" />}
          {submitting ? "Submitting..." : "Submit for review"}
        </Button>
      </div>
    </motion.div>
  )
}
