import type { ColumnMapping } from "@/lib/import/types"

// ---------------------------------------------------------------------------
// CSV/TSV parsing for uploaded bank statements. Hand-rolled — the repo has
// no csv-parse-style dependency and this is deliberately small: a RFC4180-ish
// delimited-text tokenizer plus a header-alias lookup, not a general CSV
// library.
// ---------------------------------------------------------------------------

/** Tokenizes delimited text into rows of cells. Handles a leading UTF-8 BOM,
 * double-quoted fields (with "" as an escaped quote), CRLF/CR/LF line
 * endings, and auto-detects the delimiter among comma/semicolon/tab. Blank
 * rows are dropped. */
export function parseDelimited(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const delim = detectDelimiter(src)

  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false

  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        field += c
      }
    } else if (c === '"' && field === "") {
      quoted = true
    } else if (c === delim) {
      row.push(field)
      field = ""
    } else if (c === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else if (c !== "\r") {
      field += c
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
    .map((r) => r.map((cell) => cell.trim()))
    .filter((r) => r.some((cell) => cell !== ""))
}

function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/, 20).join("\n")
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 }
  let inQuotes = false
  for (const c of sample) {
    if (c === '"') inQuotes = !inQuotes
    else if (!inQuotes && c in counts) counts[c]++
  }
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]) || ","
}

const HEADER_ALIASES: Record<keyof ColumnMapping, string[]> = {
  date: ["date", "transaction date", "txn date", "posting date", "post date", "value date"],
  description: [
    "description",
    "merchant",
    "details",
    "particulars",
    "narrative",
    "payee",
    "transaction details",
    "reference",
  ],
  amount: ["amount", "txn amount", "transaction amount", "value"],
  debit: ["debit", "withdrawal", "withdrawals", "money out", "paid out", "dr"],
  credit: ["credit", "deposit", "deposits", "money in", "paid in", "cr"],
  balance: ["balance", "running balance", "closing balance"],
}

/** Scans the first `maxScan` rows for the header row: the first row where at
 * least two cells match a known column alias. Banks routinely prepend a few
 * lines of account-summary preamble before the real header, so this can't
 * just assume row 0. Returns null if nothing in range looks like a header
 * (the caller falls back to the manual mapping step). */
export function findHeaderRow(
  rows: string[][],
  maxScan = 20
): { headerIndex: number; mapping: ColumnMapping } | null {
  for (let i = 0; i < Math.min(rows.length, maxScan); i++) {
    const mapping = detectMapping(rows[i])
    const hits = Object.values(mapping).filter((v) => v !== undefined).length
    const usable = mapping.date !== undefined && mapping.description !== undefined &&
      (mapping.amount !== undefined || mapping.debit !== undefined || mapping.credit !== undefined)
    if (hits >= 2 && usable) {
      // `usable` just proved date/description are present, so this now
      // satisfies ColumnMapping's required fields.
      return { headerIndex: i, mapping: mapping as ColumnMapping }
    }
  }
  return null
}

function detectMapping(headerRow: string[]): Partial<ColumnMapping> {
  const found: Partial<Record<keyof ColumnMapping, number>> = {}

  headerRow.forEach((cell, idx) => {
    const norm = cell.toLowerCase().trim()
    for (const [key, aliases] of Object.entries(HEADER_ALIASES) as [keyof ColumnMapping, string[]][]) {
      if (found[key] !== undefined) continue
      if (aliases.some((alias) => norm === alias || norm.includes(alias))) {
        found[key] = idx
      }
    }
  })

  return found
}

/** Best-effort header row for the manual column-mapping fallback: the
 * densest row (most non-empty cells) among the first `maxScan` rows, since
 * a real header row almost always has more populated columns than the
 * account-summary preamble above it. Used both to build the `headers` list
 * shown in the mapping UI and, deterministically, to re-find where data
 * starts once the user resubmits with an explicit mapping. */
export function guessHeaderRowIndex(rows: string[][], maxScan = 20): number {
  let best = 0
  let bestCount = -1
  for (let i = 0; i < Math.min(rows.length, maxScan); i++) {
    const count = rows[i].filter((cell) => cell !== "").length
    if (count > bestCount) {
      best = i
      bestCount = count
    }
  }
  return best
}

/** Turns delimited rows into candidate transactions using a column mapping
 * (either auto-detected by findHeaderRow or supplied by the manual mapping
 * step). Debit/credit columns win over a single amount column when both are
 * mapped, since they're unambiguous about sign; an amount column falls back
 * to sign-from-value / CR-DR-suffix (see parseMoney). Rows whose amount
 * can't be parsed at all are skipped here — they'd contribute nothing
 * useful to the preview, unlike a bad date or blank merchant, which are
 * still worth showing so the user can fix them inline. */
export function extractRows(
  dataRows: string[][],
  mapping: ColumnMapping,
  parseAmountCell: (raw: string) => number | null
): Array<{ rawDate: string; description: string; amount: number; sourceLine: string }> {
  const out: Array<{ rawDate: string; description: string; amount: number; sourceLine: string }> = []

  for (const row of dataRows) {
    const rawDate = row[mapping.date] ?? ""
    const description = row[mapping.description] ?? ""
    let amount: number | null = null

    if (mapping.debit !== undefined || mapping.credit !== undefined) {
      const debit = mapping.debit !== undefined ? parseAmountCell(row[mapping.debit] ?? "") : null
      const credit = mapping.credit !== undefined ? parseAmountCell(row[mapping.credit] ?? "") : null
      if (debit != null && debit !== 0) amount = -Math.abs(debit)
      else if (credit != null && credit !== 0) amount = Math.abs(credit)
    } else if (mapping.amount !== undefined) {
      amount = parseAmountCell(row[mapping.amount] ?? "")
    }

    if (!rawDate && !description && amount == null) continue // fully blank row
    if (amount == null) continue

    out.push({ rawDate, description, amount, sourceLine: row.join(", ") })
  }

  return out
}
