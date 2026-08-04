// ── Optional app modules ────────────────────────────────────────────────────
// Registry for modules the user can disable from Settings → Modules. Kept
// here (plain .ts, no JSX) so both client components (sidebar, command
// palette, module gate) and the settings tab can import the same list.
//
// Core pages (Overview, Accounts, Transactions, Notifications, Settings, the
// auth pages) are intentionally absent — they're always on so the app can't
// be disabled into unusability.

export type ModuleId =
  | "transfers"
  | "cards"
  | "investments"
  | "crypto"
  | "analytics"
  | "budgets"
  | "support"

export type ModuleMeta = {
  id: ModuleId
  label: string
  href: string
  description: string
}

export const OPTIONAL_MODULES: ModuleMeta[] = [
  {
    id: "transfers",
    label: "Transfers",
    href: "/transfers",
    description: "Send money and move funds between your own accounts.",
  },
  {
    id: "cards",
    label: "Cards",
    href: "/cards",
    description: "Manage your physical and virtual cards.",
  },
  {
    id: "investments",
    label: "Investments",
    href: "/investments",
    description: "Track your stock and fund portfolio.",
  },
  {
    id: "crypto",
    label: "Crypto",
    href: "/crypto",
    description: "Trade and monitor crypto holdings.",
  },
  {
    id: "analytics",
    label: "Analytics",
    href: "/analytics",
    description: "Spending insights and financial trends.",
  },
  {
    id: "budgets",
    label: "Budgets",
    href: "/budgets",
    description: "Set spending limits by category.",
  },
  {
    id: "support",
    label: "Help & Support",
    href: "/support",
    description: "FAQs and contact options.",
  },
]

export const MODULES_STORAGE_KEY = "vault-disabled-modules"

/**
 * Resolves a pathname/href to the optional module it belongs to, using a
 * prefix match so nested routes (e.g. a future `/crypto/[coin]`) are covered.
 * Returns null for always-on routes.
 */
export function moduleIdForHref(href: string): ModuleId | null {
  const match = OPTIONAL_MODULES.find(
    (m) => href === m.href || href.startsWith(`${m.href}/`)
  )
  return match?.id ?? null
}
