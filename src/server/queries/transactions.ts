import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm"
import {
  endOfMonth,
  isValid,
  parseISO,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { cards, transactions } from "@/server/db/schema"
import { displayDate, toISODate } from "@/server/db/format"
import { today } from "@/lib/today"
import { getCategoryNamesForBucket } from "@/server/queries/categories"
import type { FullTransaction, Transaction } from "@/lib/types"

const PAGE_SIZES = [10, 25, 50, 100] as const
const DEFAULT_PAGE_SIZE = 25

// Above this many matching rows, filteredIds is skipped (see
// getTransactionsPage) rather than fetching every id on every request.
const MAX_FILTERED_IDS = 5000
const MAX_MULTI_VALUES = 50

export type TransactionStatus = (typeof transactions.$inferSelect)["status"]
export type TransactionType = (typeof transactions.$inferSelect)["type"]
export type DateRangePreset = "7d" | "30d" | "90d" | "mtd" | "lastmonth" | "ytd" | "all"

export interface TransactionFilters {
  search?: string
  categories?: string[]
  statuses?: TransactionStatus[]
  type?: TransactionType
  cardIds?: Array<number | "none"> // "none" => card_id IS NULL
  accountIds?: number[]
  amountMin?: number // inclusive, compared against abs(amount)
  amountMax?: number // inclusive, compared against abs(amount)
  /** Resolved inclusive ISO bounds — the ONLY date fields buildWhere reads.
   * Always set together by parseTransactionFilters() from whichever of
   * datePreset/month/explicit dates was provided (precedence: explicit >
   * preset > month), so this is the single source of truth for filtering. */
  dateFrom?: string
  dateTo?: string
  /** Parser input + display hint only, already folded into dateFrom/dateTo
   * above — same contract as `month` and `bucket` below. */
  datePreset?: DateRangePreset
  bucket?: string // budget bucket name — resolved to underlying category names, see buildWhere
  month?: string // "YYYY-MM" — legacy deep link from budget-rings, see resolveDateBounds
}

/** Minimal adapter so the RSC page (plain-object searchParams) and the API
 * route (real URLSearchParams) can share one parser — URLSearchParams
 * already satisfies this shape structurally. */
export interface ParamSource {
  get(key: string): string | null
  getAll(key: string): string[]
}

export function fromSearchParamsObject(
  sp: Record<string, string | string[] | undefined>
): ParamSource {
  return {
    get(key) {
      const v = sp[key]
      return Array.isArray(v) ? (v[0] ?? null) : (v ?? null)
    },
    getAll(key) {
      const v = sp[key]
      if (v === undefined) return []
      return Array.isArray(v) ? v : [v]
    },
  }
}

/** Trims, drops empties, dedupes, and caps repeated param values — a guard
 * on the size of the `inArray(...)` lists they end up in. */
function uniqueTrimmed(values: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of values) {
    const v = raw.trim()
    if (!v || seen.has(v)) continue
    seen.add(v)
    out.push(v)
    if (out.length >= MAX_MULTI_VALUES) break
  }
  return out
}

const STATUS_VALUES: readonly TransactionStatus[] = ["completed", "pending", "failed"]
const TYPE_VALUES: readonly TransactionType[] = ["expense", "income"]
const DATE_PRESET_VALUES: readonly DateRangePreset[] = [
  "7d",
  "30d",
  "90d",
  "mtd",
  "lastmonth",
  "ytd",
  "all",
]
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Validates a `YYYY-MM-DD` param — the regex alone accepts nonsense like
 * "2026-13-45", which would otherwise reach a raw string comparison against
 * the date column and silently match everything. */
function parseIsoDateParam(value: string | null): string | undefined {
  if (!value || !ISO_DATE_RE.test(value)) return undefined
  return isValid(parseISO(value)) ? value : undefined
}

/** First-of-month / last-of-month ISO bounds for a "YYYY-MM" filter value,
 * mirroring currentMonthBounds() in src/server/queries/cards.ts. */
function monthBounds(month: string): { start: string; end: string } {
  const [year, mon] = month.split("-").map(Number)
  const start = new Date(year, mon - 1, 1)
  return { start: toISODate(start), end: toISODate(endOfMonth(start)) }
}

/** Resolves the three date inputs into one inclusive [dateFrom, dateTo] pair
 * — precedence is explicit from/to, then preset, then the legacy `month`
 * deep link. Presets are anchored on today() (@/lib/today), i.e. the real
 * wall-clock date. */
function resolveDateBounds(args: {
  from?: string
  to?: string
  preset?: DateRangePreset
  month?: string
}): { dateFrom?: string; dateTo?: string } {
  if (args.from || args.to) {
    return { dateFrom: args.from, dateTo: args.to }
  }

  if (args.preset && args.preset !== "all") {
    const anchor = today()
    switch (args.preset) {
      case "7d":
        return { dateFrom: toISODate(subDays(anchor, 6)), dateTo: toISODate(anchor) }
      case "30d":
        return { dateFrom: toISODate(subDays(anchor, 29)), dateTo: toISODate(anchor) }
      case "90d":
        return { dateFrom: toISODate(subDays(anchor, 89)), dateTo: toISODate(anchor) }
      case "mtd":
        return { dateFrom: toISODate(startOfMonth(anchor)), dateTo: toISODate(anchor) }
      case "lastmonth": {
        const lastMonth = subMonths(anchor, 1)
        return {
          dateFrom: toISODate(startOfMonth(lastMonth)),
          dateTo: toISODate(endOfMonth(lastMonth)),
        }
      }
      case "ytd":
        return { dateFrom: toISODate(startOfYear(anchor)), dateTo: toISODate(anchor) }
    }
  }

  if (args.month) {
    const { start, end } = monthBounds(args.month)
    return { dateFrom: start, dateTo: end }
  }

  return {}
}

/** Parses + validates every transactions-page searchParam in one place, so
 * the RSC page and the /api/transactions GET route can't drift out of sync
 * with each other — see fromSearchParamsObject() for the adapter that lets
 * both call this with their native param shape. */
export function parseTransactionFilters(src: ParamSource): TransactionFilters {
  const categories = uniqueTrimmed(src.getAll("category"))

  const statuses = uniqueTrimmed(src.getAll("status")).filter(
    (s): s is TransactionStatus => (STATUS_VALUES as readonly string[]).includes(s)
  )

  const typeRaw = src.get("type")
  const type =
    typeRaw && (TYPE_VALUES as readonly string[]).includes(typeRaw)
      ? (typeRaw as TransactionType)
      : undefined

  const cardIds = uniqueTrimmed(src.getAll("card"))
    .map((v) => (v === "none" ? ("none" as const) : Number(v)))
    .filter((v): v is number | "none" => v === "none" || (Number.isInteger(v) && v > 0))

  const accountIds = uniqueTrimmed(src.getAll("account"))
    .map((v) => Number(v))
    .filter((v): v is number => Number.isInteger(v) && v > 0)

  let amountMin: number | undefined = (() => {
    const raw = src.get("min")
    if (raw == null) return undefined
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? n : undefined
  })()
  let amountMax: number | undefined = (() => {
    const raw = src.get("max")
    if (raw == null) return undefined
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? n : undefined
  })()
  if (amountMin != null && amountMax != null && amountMin > amountMax) {
    ;[amountMin, amountMax] = [amountMax, amountMin]
  }

  const from = parseIsoDateParam(src.get("from"))
  const to = parseIsoDateParam(src.get("to"))

  const presetRaw = src.get("range")
  const datePreset =
    presetRaw && (DATE_PRESET_VALUES as readonly string[]).includes(presetRaw)
      ? (presetRaw as DateRangePreset)
      : undefined

  const monthRaw = src.get("month")
  const month = monthRaw && MONTH_RE.test(monthRaw) ? monthRaw : undefined

  const { dateFrom, dateTo } = resolveDateBounds({ from, to, preset: datePreset, month })

  return {
    search: src.get("q") ?? undefined,
    categories: categories.length > 0 ? categories : undefined,
    statuses: statuses.length > 0 ? statuses : undefined,
    type,
    cardIds: cardIds.length > 0 ? cardIds : undefined,
    accountIds: accountIds.length > 0 ? accountIds : undefined,
    amountMin,
    amountMax,
    dateFrom,
    dateTo,
    datePreset,
    month,
    bucket: src.get("bucket") ?? undefined,
  }
}

export type TransactionSortKey = "merchant" | "amount" | "date" | "status"

export interface TransactionSort {
  key: TransactionSortKey
  dir: "asc" | "desc"
}

const SORT_COLUMNS = {
  merchant: transactions.merchant,
  amount: transactions.amount,
  date: transactions.date,
  status: transactions.status,
} as const

/** Derived from SORT_COLUMNS so the set of sortable columns only has to be
 * declared once — previously duplicated as a separate literal array in
 * page.tsx, which could silently drift out of sync with this map. */
export const SORT_KEYS = Object.keys(SORT_COLUMNS) as TransactionSortKey[]

/** Validates the `sort`/`dir` searchParams against SORT_KEYS — these values
 * reach a SQL `orderBy`, so anything outside the allow-list is rejected
 * rather than passed through. Returns undefined when absent —
 * getTransactionsPage's own no-sort default already orders newest-first,
 * and the client keeps this distinct from an explicit date-desc sort so
 * clicking Date while on the default has an asc/desc cycle to move through
 * instead of "turning off" a sort that was never turned on. */
export function parseTransactionSort(src: ParamSource): TransactionSort | undefined {
  const key = src.get("sort")
  const dir = src.get("dir")
  if (!key || !SORT_KEYS.includes(key as TransactionSortKey)) return undefined
  return { key: key as TransactionSortKey, dir: dir === "asc" ? "asc" : "desc" }
}

export function parseTransactionPaging(src: ParamSource): { page: number; pageSize: number } {
  const page = Number(src.get("page")) || 1
  const pageSize = clampPageSize(Number(src.get("size")) || DEFAULT_PAGE_SIZE)
  return { page, pageSize }
}

/** Builds the `orderBy` list for both the page query and the id query, so
 * the two can never drift out of sync. `transactions.id` is always the
 * final tiebreaker — it keeps paging stable when many rows share a sort
 * value (e.g. the same date), matching the no-sort default below. */
function buildOrderBy(sort: TransactionSort | undefined) {
  if (!sort) return [desc(transactions.date), desc(transactions.id)]
  const column = SORT_COLUMNS[sort.key]
  const order = sort.dir === "asc" ? asc : desc
  return [order(column), desc(transactions.id)]
}

export interface TransactionStats {
  totalIn: number
  totalOut: number
  largest: number
  count: number
}

export interface TransactionPage {
  rows: FullTransaction[] // the current page only
  stats: TransactionStats // aggregates over ALL filtered rows
  filteredIds: string[] // ids of ALL filtered rows (for select-all) — capped, see MAX_FILTERED_IDS
  page: number // clamped to a valid range
  pageSize: number
  totalPages: number
}

function toFullTransaction(row: {
  transactions: typeof transactions.$inferSelect
  cards: typeof cards.$inferSelect | null
}): FullTransaction {
  const t = row.transactions
  return {
    id: String(t.id),
    merchant: t.merchant,
    transactionId: t.transactionId,
    amount: t.amount,
    date: displayDate(t.date),
    logo: t.logo,
    category: t.category,
    subcategory: t.subcategory ?? undefined,
    status: t.status,
    type: t.type,
    notes: t.notes ?? undefined,
    merchantInfo: t.merchantInfo ?? undefined,
    cardLast4: row.cards?.last4,
    transferId: t.transferId ?? undefined,
    cardPaymentId: t.cardPaymentId ?? undefined,
    isTransfer: t.transferId != null,
    isCardPayment: t.cardPaymentId != null,
  }
}

/** Escape LIKE metacharacters so user-typed `%` / `_` match literally instead
 * of acting as SQL wildcards. Paired with `ESCAPE '\'` at the call site. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

/** Shared predicate for the page query, the aggregate query, and the id
 * query, so the three can never drift out of sync with each other.
 * `bucketCategoryNames` is resolved by the caller (it needs an async lookup
 * against the categories table) — see getTransactionsPage. Every condition
 * here must reference bare `transactions` columns only — this where clause
 * also drives the aggregate and id queries, neither of which joins `cards`. */
function buildWhere(filters: TransactionFilters, bucketCategoryNames?: string[]): SQL {
  const conds = [eq(transactions.userId, DEMO_USER_ID)]

  if (filters.search) {
    const q = `%${escapeLike(filters.search.toLowerCase())}%`
    conds.push(
      sql`(
        lower(${transactions.merchant}) like ${q} escape '\\' or
        lower(${transactions.transactionId}) like ${q} escape '\\' or
        lower(${transactions.category}) like ${q} escape '\\' or
        lower(${transactions.subcategory}) like ${q} escape '\\'
      )`
    )
  }

  if (filters.categories?.length) {
    conds.push(inArray(transactions.category, filters.categories))
  }

  if (filters.statuses?.length) {
    conds.push(inArray(transactions.status, filters.statuses))
  }

  if (filters.type) {
    conds.push(eq(transactions.type, filters.type))
  }

  if (filters.accountIds?.length) {
    conds.push(inArray(transactions.accountId, filters.accountIds))
  }

  if (filters.cardIds?.length) {
    const numeric = filters.cardIds.filter((c): c is number => c !== "none")
    const wantsNone = filters.cardIds.includes("none")
    const parts: SQL[] = []
    if (numeric.length > 0) parts.push(inArray(transactions.cardId, numeric))
    if (wantsNone) parts.push(isNull(transactions.cardId))
    conds.push(parts.length === 1 ? parts[0] : or(...parts)!)
  }

  if (filters.amountMin != null) {
    conds.push(gte(sql`abs(${transactions.amount})`, filters.amountMin))
  }
  if (filters.amountMax != null) {
    conds.push(lte(sql`abs(${transactions.amount})`, filters.amountMax))
  }

  if (filters.bucket) {
    // A bucket that (somehow) resolves to no categories should match
    // nothing, not fall through to "no filter" — hence the always-false
    // fallback instead of skipping the condition.
    conds.push(
      bucketCategoryNames && bucketCategoryNames.length > 0
        ? inArray(transactions.category, bucketCategoryNames)
        : sql`0`
    )
  }

  if (filters.dateFrom) conds.push(gte(transactions.date, filters.dateFrom))
  if (filters.dateTo) conds.push(lte(transactions.date, filters.dateTo))

  return and(...conds)!
}

export function clampPageSize(size: number): number {
  return PAGE_SIZES.includes(size as (typeof PAGE_SIZES)[number])
    ? size
    : DEFAULT_PAGE_SIZE
}

/** Paged, filtered transactions for the Transactions page. All filters are
 * pushed down into SQL so payload size stays flat as the ledger grows — see
 * buildWhere() above. */
export async function getTransactionsPage(
  filters: TransactionFilters,
  opts: { page: number; pageSize: number; sort?: TransactionSort }
): Promise<TransactionPage> {
  const db = getDb()
  const bucketCategoryNames = filters.bucket
    ? await getCategoryNamesForBucket(filters.bucket)
    : undefined
  const where = buildWhere(filters, bucketCategoryNames)
  const pageSize = clampPageSize(opts.pageSize)
  const orderBy = buildOrderBy(opts.sort)

  const [{ count, totalIn, totalOut, largest }] = db
    .select({
      count: sql<number>`count(*)`,
      totalIn: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
      totalOut: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then abs(${transactions.amount}) else 0 end), 0)`,
      largest: sql<number>`coalesce(max(abs(${transactions.amount})), 0)`,
    })
    .from(transactions)
    .where(where)
    .all()

  const totalPages = Math.max(1, Math.ceil(count / pageSize))
  const page = Math.min(Math.max(1, opts.page), totalPages)

  const rows = db
    .select()
    .from(transactions)
    .leftJoin(cards, eq(transactions.cardId, cards.id))
    .where(where)
    .orderBy(...orderBy)
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .all()

  // Only fetched up to MAX_FILTERED_IDS — beyond that, "select all" falls
  // back to page-only selection (see the empty-array handling in
  // transaction-table.tsx) rather than materializing every matching id on
  // every request. Also skips the (unnecessary) order-by: this list only
  // feeds Set membership checks, never anything display-ordered.
  const idRows =
    count <= MAX_FILTERED_IDS
      ? db.select({ id: transactions.id }).from(transactions).where(where).all()
      : []

  return {
    rows: rows.map(toFullTransaction),
    stats: { totalIn, totalOut, largest, count },
    filteredIds: idRows.map((r) => String(r.id)),
    page,
    pageSize,
    totalPages,
  }
}

/** Full rows for a set of ids, regardless of the current filters/page —
 * powers CSV export of a cross-page selection. */
export async function getTransactionsByIds(ids: string[]): Promise<FullTransaction[]> {
  if (ids.length === 0) return []
  const db = getDb()
  const numericIds = ids.map((id) => Number(id)).filter((id) => Number.isInteger(id))
  if (numericIds.length === 0) return []

  const rows = db
    .select()
    .from(transactions)
    .leftJoin(cards, eq(transactions.cardId, cards.id))
    .where(and(eq(transactions.userId, DEMO_USER_ID), inArray(transactions.id, numericIds)))
    .orderBy(desc(transactions.date), desc(transactions.id))
    .all()
  return rows.map(toFullTransaction)
}

/** Most recent transactions for the dashboard widget and command palette. */
export async function getRecentTransactions(limit = 7): Promise<Transaction[]> {
  const db = getDb()
  const rows = db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, DEMO_USER_ID))
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(limit)
    .all()
  return rows.map((row) => ({
    id: String(row.id),
    merchant: row.merchant,
    transactionId: row.transactionId,
    amount: row.amount,
    date: displayDate(row.date),
    logo: row.logo,
    category: row.category,
  }))
}
