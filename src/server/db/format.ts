import { format, parseISO } from "date-fns"

/** ISO "yyyy-MM-dd" -> display "Apr 10, 2026", matching the original seed data's date strings. */
export function displayDate(iso: string): string {
  return format(parseISO(iso), "MMM dd, yyyy")
}

/** JS Date -> ISO "yyyy-MM-dd" for storage. */
export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd")
}
