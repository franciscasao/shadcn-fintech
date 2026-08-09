import { InfoIcon } from "lucide-react"

/** Tinted notice for pages that are still sample-data-only (crypto,
 * investments, support — see the comment on `data` in @/components/app-sidebar
 * for why they're absent from the nav despite being routable). Same visual
 * idiom as the amber "paying only the minimum" notice in
 * @/components/budgets/month-projection, just in the neutral/info palette
 * rather than a warning one. */
export function PreviewBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
      <InfoIcon className="mt-0.5 size-4 shrink-0 text-primary" />
      <p>{children}</p>
    </div>
  )
}
