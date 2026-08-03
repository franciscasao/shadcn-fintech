import {
  UtensilsIcon,
  CarIcon,
  Gamepad2Icon,
  ShoppingBagIcon,
  RepeatIcon,
  HeartPulseIcon,
  GraduationCapIcon,
  PlaneIcon,
} from "lucide-react"

// Shared between BudgetRings (rendering) and AddBudget (icon picker) — kept
// client-safe (no server imports) so it can be pulled into either without
// dragging the SQLite driver into the client bundle.

export const BUDGET_ICONS = [
  { name: "utensils", label: "Food & Dining" },
  { name: "car", label: "Transport" },
  { name: "gamepad-2", label: "Entertainment" },
  { name: "shopping-bag", label: "Shopping" },
  { name: "repeat", label: "Subscriptions" },
  { name: "heart-pulse", label: "Health" },
  { name: "graduation-cap", label: "Education" },
  { name: "plane", label: "Travel" },
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
}
