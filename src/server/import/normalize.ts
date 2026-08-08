import { isValid, parse, parseISO } from "date-fns"

// ---------------------------------------------------------------------------
// Text-cleanup helpers shared by the CSV and PDF statement parsers
// (src/server/import/csv.ts, pdf.ts) and by the duplicate-detection /
// category-guessing pass (src/server/import/enrich.ts) — kept in one place
// so those two consumers can't drift apart on what counts as "the same
// merchant" or "the same amount".
// ---------------------------------------------------------------------------

/** Parses a statement's money string into a signed number, or null if it
 * isn't one. Handles the currency symbols this app already uses (₱$€£),
 * thousands separators, parenthesized negatives ("(1,234.56)"), a leading
 * sign, and trailing CR/DR suffixes some issuers append instead of a sign
 * (CR = credit/positive, DR = debit/negative). */
export function parseMoney(raw: string): number | null {
  if (!raw) return null
  let s = raw.trim()
  if (!s) return null

  let sign = 1
  const crdr = s.match(/\s*(CR|DR)\s*$/i)
  if (crdr) {
    sign = crdr[1].toUpperCase() === "DR" ? -1 : 1
    s = s.slice(0, crdr.index).trim()
  }

  if (s.startsWith("(") && s.endsWith(")")) {
    sign *= -1
    s = s.slice(1, -1).trim()
  }

  s = s.replace(/[₱$€£\s]/g, "")
  if (s.startsWith("-")) {
    sign *= -1
    s = s.slice(1)
  } else if (s.startsWith("+")) {
    s = s.slice(1)
  }

  s = s.replace(/,/g, "")
  if (!/^\d+(\.\d+)?$/.test(s)) return null

  const n = Number(s)
  return Number.isFinite(n) ? sign * n : null
}

// Tried in order; the first one that both matches the shape AND parses to a
// valid calendar date wins. Covers ISO, slash/dash/dot-separated numeric
// dates in both day-first and month-first order, and the two common
// "14 Mar 2026" / "Mar 14, 2026" spellings.
const DATE_FORMATS = [
  "yyyy-MM-dd",
  "dd/MM/yyyy",
  "MM/dd/yyyy",
  "dd-MM-yyyy",
  "MM-dd-yyyy",
  "dd/MM/yy",
  "MM/dd/yy",
  "d MMM yyyy",
  "d MMM yy",
  "MMM d, yyyy",
  "MMM d yyyy",
]

/** Parses a statement date string into ISO yyyy-MM-dd, or null if none of
 * the known shapes fit. `preferDayFirst` disambiguates the numeric
 * slash/dash formats (e.g. "03/04/2026") — see resolveDateOrder below,
 * which decides it once per file from the file's own data rather than
 * guessing per row. */
export function parseStatementDate(raw: string, preferDayFirst = false): string | null {
  const s = raw.trim().replace(/,/g, ", ").replace(/\s+/g, " ").trim()
  if (!s) return null

  const numericFirst = preferDayFirst
    ? ["dd/MM/yyyy", "dd-MM-yyyy", "dd/MM/yy"]
    : ["MM/dd/yyyy", "MM-dd-yyyy", "MM/dd/yy"]
  const ordered = [
    "yyyy-MM-dd",
    ...numericFirst,
    ...DATE_FORMATS.filter((f) => !numericFirst.includes(f) && f !== "yyyy-MM-dd"),
  ]

  for (const fmt of ordered) {
    const d = parse(s, fmt, new Date())
    if (isValid(d) && d.getFullYear() > 1990 && d.getFullYear() < 2100) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    }
  }
  return null
}

/** Scans a batch of raw date strings and decides whether the file is
 * day-first (dd/MM) or month-first (MM/dd): if any row's first numeric
 * component exceeds 12, the file can't be month-first, so it's day-first.
 * Defaults to month-first (the more common convention in exported CSVs)
 * when the sample is ambiguous. */
export function resolveDateOrder(rawDates: string[]): boolean {
  for (const raw of rawDates) {
    const m = raw.trim().match(/^(\d{1,2})[/-]/)
    if (m && Number(m[1]) > 12) return true
  }
  return false
}

/** Collapses a merchant string to a comparable key: lowercase, strip
 * anything that isn't a letter or digit, collapse runs of whitespace. Used
 * by both duplicate detection (is this the same row as one already in the
 * ledger?) and category guessing (has this merchant been categorized
 * before?) so the two heuristics can't disagree on what "the same merchant"
 * means. */
export function normalizeMerchant(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/** True when two normalized merchant strings are "the same" for duplicate/
 * category matching: exact match, or one contains the other (statement
 * merchant text is often a truncated or suffixed version of what's already
 * in the ledger, e.g. "grab *ride 8821" vs "grab"). Guarded by a minimum
 * length so short strings don't match everything. */
export function merchantsLikelyMatch(a: string, b: string): boolean {
  if (!a || !b) return false
  if (a === b) return true
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a]
  return shorter.length >= 4 && longer.includes(shorter)
}

/** Whole-day difference between two ISO yyyy-MM-dd strings (a - b), used by
 * duplicate detection to allow a ±1 day match between a statement's
 * transaction date and the ledger's posting date. */
export function dayOffset(a: string, b: string): number {
  return Math.round((parseISO(a).getTime() - parseISO(b).getTime()) / 86_400_000)
}
