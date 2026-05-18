"use client"

import { useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import { ShieldCheckIcon, XIcon, ClockIcon, ArrowRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  KYC_STATUS_KEY,
  KYC_SUBMITTED_AT_KEY,
} from "@/components/kyc/kyc-page-client"

const DISMISSED_KEY = "vault-kyc-banner-dismissed"
const REVIEW_GRACE_DAYS = 7

type Status = "none" | "submitted" | "verified" | "dismissed"

function readStatus(): Status {
  try {
    const saved = localStorage.getItem(KYC_STATUS_KEY)
    if (saved === "verified") return "verified"
    if (saved === "submitted") {
      const at = localStorage.getItem(KYC_SUBMITTED_AT_KEY)
      if (at) {
        const days = (Date.now() - new Date(at).getTime()) / 86400000
        if (days > REVIEW_GRACE_DAYS) return "none"
      }
      return "submitted"
    }
    return localStorage.getItem(DISMISSED_KEY) === "true" ? "dismissed" : "none"
  } catch {
    return "none"
  }
}

// useSyncExternalStore lets us read from localStorage safely with SSR.
// We subscribe to "storage" events so other tabs flipping status propagate.
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  return () => window.removeEventListener("storage", callback)
}

export function KycBanner() {
  const baseStatus = useSyncExternalStore(
    subscribe,
    readStatus,
    () => "none" as const, // SSR snapshot
  )
  // Local dismiss state lets the user dismiss without firing a storage event.
  const [localDismissed, setLocalDismissed] = useState(false)
  const status: Status = localDismissed ? "dismissed" : baseStatus

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, "true")
    } catch {
      // ignore
    }
    setLocalDismissed(true)
  }

  if (status === "verified" || status === "dismissed") {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        layout
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={cn(
          "relative flex items-start gap-3 rounded-xl border p-3.5 sm:items-center sm:p-4",
          status === "submitted"
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-amber-500/20 bg-amber-500/5",
        )}
      >
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            status === "submitted"
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
          )}
        >
          {status === "submitted" ? (
            <ClockIcon className="size-4" />
          ) : (
            <ShieldCheckIcon className="size-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {status === "submitted"
              ? "Identity submitted — under review"
              : "Verify your identity to unlock transfers over $1,000"}
          </p>
          <p className="text-xs text-muted-foreground">
            {status === "submitted"
              ? "We'll email you once your verification is complete. Usually 24 to 48 hours."
              : "Required by financial regulations. Takes about 3 minutes."}
          </p>
        </div>

        {status === "none" && (
          <Button
            size="sm"
            className="shrink-0 gap-1.5"
            render={<Link href="/verify-identity" />}
          >
            Verify now
            <ArrowRightIcon className="size-3.5" />
          </Button>
        )}

        {status === "none" && (
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:static sm:p-0"
            aria-label="Dismiss"
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
