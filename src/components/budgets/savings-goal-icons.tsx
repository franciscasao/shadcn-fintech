import {
  PalmtreeIcon,
  ShieldIcon,
  CarIcon,
  HomeIcon,
  GraduationCapIcon,
  PlaneIcon,
  GiftIcon,
  HeartPulseIcon,
} from "lucide-react"

// Shared between SavingsGoals (rendering) and AddSavingsGoal (icon picker) —
// mirrors budget-icons.tsx's split so neither component owns the list.

export const SAVINGS_GOAL_ICONS = [
  { name: "palm-tree", label: "Vacation" },
  { name: "shield", label: "Emergency Fund" },
  { name: "car", label: "Vehicle" },
  { name: "home", label: "Home" },
  { name: "graduation-cap", label: "Education" },
  { name: "plane", label: "Travel" },
  { name: "gift", label: "Gift" },
  { name: "heart-pulse", label: "Health" },
] as const

export const savingsGoalIconMap: Record<string, React.ReactNode> = {
  "palm-tree": <PalmtreeIcon className="size-5" />,
  shield: <ShieldIcon className="size-5" />,
  car: <CarIcon className="size-5" />,
  home: <HomeIcon className="size-5" />,
  "graduation-cap": <GraduationCapIcon className="size-5" />,
  plane: <PlaneIcon className="size-5" />,
  gift: <GiftIcon className="size-5" />,
  "heart-pulse": <HeartPulseIcon className="size-5" />,
}
