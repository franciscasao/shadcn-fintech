"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { moduleIdForHref } from "@/lib/modules"
import { useDisabledModules } from "@/hooks/use-disabled-modules"

// Bounces off any route whose module has been disabled in Settings →
// Modules, back to /dashboard. Wraps every page under the (dashboard) route
// group from the layout, so individual page.tsx files don't need to opt in.
//
// This is a client-side, localStorage-backed gate — cosmetic decluttering,
// not access control. The server still renders the page's RSC payload
// before this redirect fires.
export function ModuleGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { disabled } = useDisabledModules()

  const moduleId = moduleIdForHref(pathname)
  const blocked = moduleId !== null && disabled.has(moduleId)

  useEffect(() => {
    if (blocked) router.replace("/dashboard")
  }, [blocked, router])

  if (blocked) return null

  return children
}
