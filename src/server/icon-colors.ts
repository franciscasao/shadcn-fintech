// Icon name -> Tailwind text-color class, resolved server-side so the
// Tailwind scanner sees the literal class strings (the client only ever
// sends an icon name, never a raw class string, which the scanner couldn't
// see and would purge in prod). Shared by the budget-category and
// transaction-category mutations, and by their respective API routes for
// icon-name validation — kept in one place so the two never drift.
//
// Names match BUDGET_ICONS in src/components/budgets/budget-icons.tsx.
export const ICON_COLORS: Record<string, string> = {
  utensils: "text-orange-500",
  car: "text-blue-500",
  "gamepad-2": "text-purple-500",
  "shopping-bag": "text-pink-500",
  repeat: "text-cyan-500",
  "heart-pulse": "text-emerald-500",
  "graduation-cap": "text-amber-500",
  plane: "text-rose-500",
  cpu: "text-slate-500",
  palette: "text-fuchsia-500",
  sparkles: "text-indigo-500",
  "check-square": "text-teal-500",
  banknote: "text-green-500",
}

export const KNOWN_ICON_NAMES = Object.keys(ICON_COLORS)
