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
  ScissorsIcon,
  WashingMachineIcon,
  ShoppingCartIcon,
  StarIcon,
  ShoppingBasketIcon,
  TrainFrontIcon,
  HandCoinsIcon,
  ShieldIcon,
  WifiIcon,
  ZapIcon,
  TrendingUpIcon,
  PiggyBankIcon,
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
  { name: "scissors", label: "Haircut" },
  { name: "washing-machine", label: "Laundry" },
  { name: "shopping-cart", label: "Grocery" },
  { name: "star", label: "Wants" },
  { name: "shopping-basket", label: "Needs" },
  { name: "train-front", label: "Train" },
  { name: "hand-coins", label: "Debt" },
  { name: "shield", label: "Insurance" },
  { name: "wifi", label: "Internet" },
  { name: "zap", label: "Electricity" },
  { name: "trending-up", label: "Investments" },
  { name: "piggy-bank", label: "Savings" },
] as const

// Budget bucket names used to live here as a hardcoded constant, but budgets
// are now user-managed (renamable/deletable — see BudgetDialog /
// DeleteBudgetDialog), so the Categories settings tab's bucket picker now
// fetches live names via getBudgetBuckets() instead (see
// src/components/settings/category-dialog.tsx).

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
  scissors: <ScissorsIcon className="size-5" />,
  "washing-machine": <WashingMachineIcon className="size-5" />,
  "shopping-cart": <ShoppingCartIcon className="size-5" />,
  star: <StarIcon className="size-5" />,
  "shopping-basket": <ShoppingBasketIcon className="size-5" />,
  "train-front": <TrainFrontIcon className="size-5" />,
  "hand-coins": <HandCoinsIcon className="size-5" />,
  shield: <ShieldIcon className="size-5" />,
  wifi: <WifiIcon className="size-5" />,
  zap: <ZapIcon className="size-5" />,
  "trending-up": <TrendingUpIcon className="size-5" />,
  "piggy-bank": <PiggyBankIcon className="size-5" />,
}
