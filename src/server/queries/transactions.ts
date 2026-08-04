import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { cards, transactions } from "@/server/db/schema"
import { displayDate } from "@/server/db/format"
import type { FullTransaction, Transaction } from "@/lib/types"

const PAGE_SIZES = [10, 25, 50, 100] as const
const DEFAULT_PAGE_SIZE = 25

export interface TransactionFilters {
  search?: string
  category?: string // undefined/"all" = no filter
  status?: string
  type?: string
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
  filteredIds: string[] // ids of ALL filtered rows (for select-all)
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
    status: t.status,
    type: t.type,
    notes: t.notes ?? undefined,
    merchantInfo: t.merchantInfo ?? undefined,
    cardLast4: row.cards?.last4,
  }
}

/** Escape LIKE metacharacters so user-typed `%` / `_` match literally instead
 * of acting as SQL wildcards. Paired with `ESCAPE '\'` at the call site. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

/** Shared predicate for the page query, the aggregate query, and the id
 * query, so the three can never drift out of sync with each other. */
function buildWhere(filters: TransactionFilters): SQL {
  const conds = [eq(transactions.userId, DEMO_USER_ID)]

  if (filters.search) {
    const q = `%${escapeLike(filters.search.toLowerCase())}%`
    conds.push(
      sql`(
        lower(${transactions.merchant}) like ${q} escape '\\' or
        lower(${transactions.transactionId}) like ${q} escape '\\' or
        lower(${transactions.category}) like ${q} escape '\\'
      )`
    )
  }

  if (filters.category && filters.category !== "all") {
    conds.push(eq(transactions.category, filters.category))
  }

  if (filters.status && filters.status !== "all") {
    conds.push(
      eq(
        transactions.status,
        filters.status as (typeof transactions.$inferSelect)["status"]
      )
    )
  }

  if (filters.type && filters.type !== "all") {
    conds.push(
      eq(transactions.type, filters.type as (typeof transactions.$inferSelect)["type"])
    )
  }

  return and(...conds)!
}

export function clampPageSize(size: number): number {
  return PAGE_SIZES.includes(size as (typeof PAGE_SIZES)[number])
    ? size
    : DEFAULT_PAGE_SIZE
}

/** Paged, filtered transactions for the Transactions page. Search + category +
 * status + type are pushed down into SQL so payload size stays flat as the
 * ledger grows — see buildWhere() above. */
export async function getTransactionsPage(
  filters: TransactionFilters,
  opts: { page: number; pageSize: number; sort?: TransactionSort }
): Promise<TransactionPage> {
  const db = getDb()
  const where = buildWhere(filters)
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

  const idRows = db
    .select({ id: transactions.id })
    .from(transactions)
    .where(where)
    .orderBy(...orderBy)
    .all()

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
