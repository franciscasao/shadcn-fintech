"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CameraIcon,
  Loader2Icon,
  CheckCircle2Icon,
  UserIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { KycData } from "@/components/kyc/kyc-page-client"

interface SelfieStepProps {
  data: KycData
  onChange: (patch: Partial<KycData>) => void
  onBack: () => void
  onNext: () => void
}

type SelfieState = "idle" | "capturing" | "verifying" | "done"

export function SelfieStep({ data, onChange, onBack, onNext }: SelfieStepProps) {
  const [state, setState] = useState<SelfieState>(data.selfieCaptured ? "done" : "idle")

  function handleCapture() {
    setState("capturing")
    setTimeout(() => {
      setState("verifying")
      setTimeout(() => {
        setState("done")
        onChange({ selfieCaptured: true })
      }, 1500)
    }, 700)
  }

  function handleRetake() {
    setState("idle")
    onChange({ selfieCaptured: false })
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="space-y-4"
    >
      <div>
        <h2 className="text-lg font-semibold">Take a selfie</h2>
        <p className="text-sm text-muted-foreground">
          Position your face inside the circle. We&apos;ll match it against your ID.
        </p>
      </div>

      {/* Camera frame */}
      <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl bg-zinc-950 ring-1 ring-foreground/10">
        {/* Faux camera background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950" />
        {/* Subtle noise */}
        <div
          className="absolute inset-0 opacity-30 mix-blend-overlay"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.06), transparent 40%), radial-gradient(circle at 70% 80%, rgba(255,255,255,0.06), transparent 40%)",
          }}
        />

        {/* Circular guide */}
        <svg className="absolute inset-4" viewBox="0 0 200 200" fill="none">
          <motion.circle
            cx="100"
            cy="100"
            r="90"
            stroke="white"
            strokeOpacity="0.4"
            strokeWidth="2"
            strokeDasharray="6 4"
            initial={{ rotate: 0 }}
            animate={{ rotate: state === "verifying" ? 360 : 0 }}
            transition={{
              duration: 3,
              repeat: state === "verifying" ? Infinity : 0,
              ease: "linear",
            }}
            style={{ transformOrigin: "100px 100px" }}
          />
          {state === "done" && (
            <motion.circle
              cx="100"
              cy="100"
              r="90"
              stroke="rgb(16, 185, 129)"
              strokeWidth="3"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          )}
        </svg>

        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {state === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center gap-2 text-white/40"
              >
                <UserIcon className="size-16" />
                <p className="text-[11px] uppercase tracking-wider">Ready to capture</p>
              </motion.div>
            )}
            {state === "capturing" && (
              <motion.div
                key="cap"
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: [1, 1.2, 0], opacity: [1, 1, 0] }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 rounded-2xl bg-white"
              />
            )}
            {state === "verifying" && (
              <motion.div
                key="verify"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-2 text-white"
              >
                <Loader2Icon className="size-10 animate-spin" />
                <p className="text-xs font-medium uppercase tracking-wider">
                  Verifying liveness...
                </p>
              </motion.div>
            )}
            {state === "done" && (
              <motion.div
                key="done"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
                className="flex flex-col items-center gap-2 text-emerald-400"
              >
                <CheckCircle2Icon className="size-14" />
                <p className="text-xs font-medium uppercase tracking-wider">
                  Liveness confirmed
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center">
        {state === "idle" && (
          <Button onClick={handleCapture} size="lg" className="gap-2">
            <CameraIcon className="size-4" />
            Capture
          </Button>
        )}
        {(state === "capturing" || state === "verifying") && (
          <Button size="lg" disabled className="gap-2">
            <Loader2Icon className="size-4 animate-spin" />
            Processing...
          </Button>
        )}
        {state === "done" && (
          <Button variant="outline" size="sm" onClick={handleRetake}>
            Retake
          </Button>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onBack}>
          <ArrowLeftIcon className="size-3.5" />
          Back
        </Button>
        <Button className="flex-1 gap-1.5" onClick={onNext} disabled={state !== "done"}>
          Continue
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
    </motion.div>
  )
}
