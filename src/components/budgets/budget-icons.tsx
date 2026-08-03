import {
  UtensilsIcon,
  CarIcon,
  Gamepad2Icon,
  ShoppingBagIcon,
  RepeatIcon,
  HeartPulseIcon,
  GraduationCapIcon,
  PlaneIcon,
  CpuIcon,
  PaletteIcon,
  SparklesIcon,
  CheckSquareIcon,
  BanknoteIcon,
} from "lucide-react"

// Shared between BudgetRings (rendering) and AddBudget (icon picker) — kept
// client-safe (no server imports) so it can be pulled into either without
// dragging the SQLite driver into the client bundle. Also reused by the
// Categories settings tab's icon picker (src/components/settings/category-dialog.tsx).

export const BUDGET_ICONS = [
  { name: "utensils", label: "Food & Dining" },
  { name: "car", label: "Transport" },
  { name: "gamepad-2", label: "Entertainment" },
  { name: "shopping-bag", label: "Shopping" },
  { name: "repeat", label: "Subscriptions" },
  { name: "heart-pulse", label: "Health" },
  { name: "graduation-cap", label: "Education" },
  { name: "plane", label: "Travel" },
  { name: "cpu", label: "Technology" },
  { name: "palette", label: "Design" },
  { name: "sparkles", label: "AI Tools" },
  { name: "check-square", label: "Productivity" },
  { name: "banknote", label: "Income" },
] as const

// The 8 fixed analytics/budget buckets (see BudgetCategory / budget_categories
// table) that a transaction category can roll up into. Reused by the
// Categories settings tab's bucket picker (category-dialog.tsx) — kept as a
// client-safe constant rather than fetched, since this set isn't itself
// editable through that flow.
export const BUDGET_BUCKET_NAMES = [
  "Food & Dining",
  "Transport",
  "Entertainment",
  "Shopping",
  "Subscriptions",
  "Health",
  "Travel",
  "Education",
] as const

export const budgetIconMap: Record<string, React.ReactNode> = {
  utensils: <UtensilsIcon className="size-5" />,
  car: <CarIcon className="size-5" />,
  "gamepad-2": <Gamepad2Icon className="size-5" />,
  "shopping-bag": <ShoppingBagIcon className="size-5" />,
  repeat: <RepeatIcon className="size-5" />,
  "heart-pulse": <HeartPulseIcon className="size-5" />,
  "graduation-cap": <GraduationCapIcon className="size-5" />,
  plane: <PlaneIcon className="size-5" />,
  cpu: <CpuIcon className="size-5" />,
  palette: <PaletteIcon className="size-5" />,
  sparkles: <SparklesIcon className="size-5" />,
  "check-square": <CheckSquareIcon className="size-5" />,
  banknote: <BanknoteIcon className="size-5" />,
}
