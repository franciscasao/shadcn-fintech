"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  FileBadgeIcon,
  IdCardIcon,
  CreditCardIcon,
  UploadIcon,
  Loader2Icon,
  CheckCircle2Icon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { KycData, DocSide } from "@/components/kyc/kyc-page-client"

interface DocumentStepProps {
  data: KycData
  onChange: (patch: Partial<KycData>) => void
  onBack: () => void
  onNext: () => void
}

type DocOption = {
  id: KycData["docType"]
  label: string
  icon: React.ReactNode
  needsBack: boolean
}

const docOptions: DocOption[] = [
  { id: "passport", label: "Passport", icon: <FileBadgeIcon className="size-4" />, needsBack: false },
  { id: "driver-license", label: "Driver's license", icon: <CreditCardIcon className="size-4" />, needsBack: true },
  { id: "national-id", label: "National ID card", icon: <IdCardIcon className="size-4" />, needsBack: true },
]

function UploadZone({
  label,
  side,
  state,
  onUpload,
}: {
  label: string
  side: DocSide
  state: { name: string; uploaded: boolean; uploading?: boolean }
  onUpload: (side: DocSide) => void
}) {
  const filenames = ["ID-front-IMG_4231.jpg", "ID-back-IMG_4232.jpg", "passport-page-1.jpg"]
  return (
    <button
      type="button"
      onClick={() => !state.uploaded && !state.uploading && onUpload(side)}
      disabled={state.uploaded || state.uploading}
      className={cn(
        "group relative flex aspect-[1.6/1] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed transition-all",
        state.uploaded
          ? "border-emerald-500/50 bg-emerald-500/5"
          : "border-muted-foreground/30 hover:border-primary hover:bg-primary/5",
      )}
    >
      <AnimatePresence mode="wait">
        {state.uploading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-2"
          >
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Uploading {label.toLowerCase()}...</p>
          </motion.div>
        ) : state.uploaded ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-2 text-emerald-600 dark:text-emerald-400"
          >
            <CheckCircle2Icon className="size-7" />
            <p className="px-3 text-xs font-medium">
              {filenames[side === "front" ? 0 : 1]}
            </p>
            <p className="text-[10px] text-muted-foreground">Uploaded</p>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-2"
          >
            <UploadIcon className="size-6 text-muted-foreground transition-transform group-hover:-translate-y-0.5" />
            <p className="text-sm font-medium">{label}</p>
            <p className="text-[11px] text-muted-foreground">Click to upload</p>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}

export function DocumentStep({ data, onChange, onBack, onNext }: DocumentStepProps) {
  const [frontUploading, setFrontUploading] = useState(false)
  const [backUploading, setBackUploading] = useState(false)
  const docCfg = docOptions.find((d) => d.id === data.docType)
  const needsBack = !!docCfg?.needsBack

  function handleUpload(side: DocSide) {
    if (side === "front") {
      setFrontUploading(true)
      setTimeout(() => {
        onChange({ docFront: { name: "uploaded.jpg", uploaded: true } })
        setFrontUploading(false)
      }, 1500)
    } else {
      setBackUploading(true)
      setTimeout(() => {
        onChange({ docBack: { name: "uploaded.jpg", uploaded: true } })
        setBackUploading(false)
      }, 1500)
    }
  }

  const valid =
    data.docFront.uploaded && (!needsBack || data.docBack.uploaded)

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="space-y-4"
    >
      <div>
        <h2 className="text-lg font-semibold">Verify your ID</h2>
        <p className="text-sm text-muted-foreground">
          Upload a clear photo of your government-issued ID.
        </p>
      </div>

      {/* Doc type picker */}
      <div className="grid grid-cols-3 gap-2">
        {docOptions.map((opt) => {
          const selected = data.docType === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange({ docType: opt.id, docFront: { name: "", uploaded: false }, docBack: { name: "", uploaded: false } })}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all",
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "hover:bg-muted/50",
              )}
            >
              <div className={cn("flex size-8 items-center justify-center rounded-lg", selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {opt.icon}
              </div>
              <span className="text-[11px] font-medium leading-tight">{opt.label}</span>
            </button>
          )
        })}
      </div>

      {/* Upload zones */}
      <div className={cn("grid gap-3", needsBack ? "grid-cols-2" : "grid-cols-1")}>
        <UploadZone
          label={needsBack ? "Front" : "ID page"}
          side="front"
          state={{ ...data.docFront, uploading: frontUploading }}
          onUpload={handleUpload}
        />
        {needsBack && (
          <UploadZone
            label="Back"
            side="back"
            state={{ ...data.docBack, uploading: backUploading }}
            onUpload={handleUpload}
          />
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Tip: make sure all 4 corners are visible and the text is readable.
      </p>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onBack}>
          <ArrowLeftIcon className="size-3.5" />
          Back
        </Button>
        <Button className="flex-1 gap-1.5" onClick={onNext} disabled={!valid}>
          Continue
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
    </motion.div>
  )
}
