import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import type { SortDir } from "@/hooks/use-table-sort"

/** Sort direction indicator for a clickable column/row header. Dimmed
 * ArrowUpDown when this column isn't the active sort key, otherwise a solid
 * Up/Down arrow reflecting the current direction. Shared by every sortable
 * table so the indicator behaves identically everywhere. */
export function SortIcon<K extends string>({
  col,
  sortKey,
  sortDir,
}: {
  col: K
  sortKey: K | null
  sortDir: SortDir
}) {
  if (sortKey !== col) return <ArrowUpDown className="ml-1 inline size-3 text-muted-foreground/50" />
  if (sortDir === "asc") return <ArrowUp className="ml-1 inline size-3" />
  return <ArrowDown className="ml-1 inline size-3" />
}
