import * as React from "react"

export type SortDir = "asc" | "desc" | null

interface UseTableSortResult<T, K extends string> {
  sortKey: K | null
  sortDir: SortDir
  toggleSort: (key: K) => void
  sorted: T[]
}

/** Shared click-to-sort state for table/list headers: cycles a column
 * through asc -> desc -> off, and memoizes the sorted rows. `compare` is
 * always called in ascending order for the given key — this hook flips it
 * for "desc" and skips sorting entirely (returning `rows` untouched) once
 * the direction cycles back to null, so the caller's default ordering
 * shows through. */
export function useTableSort<T, K extends string>(
  rows: T[],
  compare: (a: T, b: T, key: K) => number
): UseTableSortResult<T, K> {
  const [sortKey, setSortKey] = React.useState<K | null>(null)
  const [sortDir, setSortDir] = React.useState<SortDir>(null)

  const toggleSort = React.useCallback(
    (key: K) => {
      if (sortKey !== key) {
        setSortKey(key)
        setSortDir("asc")
      } else if (sortDir === "asc") {
        setSortDir("desc")
      } else {
        setSortKey(null)
        setSortDir(null)
      }
    },
    [sortKey, sortDir]
  )

  const sorted = React.useMemo(() => {
    if (!sortKey || !sortDir) return rows
    const arr = [...rows]
    arr.sort((a, b) => {
      const cmp = compare(a, b, sortKey)
      return sortDir === "asc" ? cmp : -cmp
    })
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortKey, sortDir])

  return { sortKey, sortDir, toggleSort, sorted }
}
