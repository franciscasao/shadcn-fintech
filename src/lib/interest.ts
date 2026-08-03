// ---------------------------------------------------------------------------
// Small formatting/estimation helpers for the account interest & crediting
// fields introduced by the PH institution registry (@/lib/ph-institutions).
// Shared by the account card, the account summary tiles, and the institution
// picker so the "3.50% p.a. · daily, end of day" phrasing stays consistent.
// ---------------------------------------------------------------------------

import type { CreditingFrequency, CreditingTiming } from "@/lib/ph-institutions"

export function formatRate(rate: number | null | undefined): string {
  if (rate == null) return "—"
  return `${rate.toFixed(2)}% p.a.`
}

const FREQUENCY_LABEL: Record<CreditingFrequency, string> = {
  daily: "daily",
  monthly: "monthly",
  quarterly: "quarterly",
  maturity: "at maturity",
  none: "no interest",
}

const TIMING_LABEL: Record<CreditingTiming, string> = {
  start_of_day: "start of day",
  end_of_day: "end of day",
  month_end: "month-end",
  maturity: "maturity",
}

/** e.g. "daily, end of day" / "quarterly, month-end" / "no interest" */
export function creditingLabel(
  frequency: CreditingFrequency,
  timing?: CreditingTiming | null
): string {
  if (frequency === "none") return FREQUENCY_LABEL.none
  const freqLabel = FREQUENCY_LABEL[frequency]
  if (!timing) return freqLabel
  return `${freqLabel}, ${TIMING_LABEL[timing]}`
}

/**
 * Rough estimated interest for one month, applying `interestCap` (the
 * balance above which the headline rate stops) if provided. This is a
 * simple, non-compounding approximation for display purposes only.
 */
export function estimateMonthlyInterest(
  balance: number,
  rate: number | null | undefined,
  cap?: number | null
): number {
  if (!rate || balance <= 0) return 0
  const eligible = cap != null ? Math.min(balance, cap) : balance
  return (eligible * (rate / 100)) / 12
}
