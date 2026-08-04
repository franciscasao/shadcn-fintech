"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"
import { MODULES_STORAGE_KEY, type ModuleId } from "@/lib/modules"

// ── Disabled-modules store ──────────────────────────────────────────────────
// Backed by localStorage, shared across every component that needs it
// (sidebar, command palette, settings tab, route gate) via
// useSyncExternalStore so they all stay in sync without prop drilling.
//
// getSnapshot returns the raw JSON string rather than a parsed array —
// returning a freshly parsed array on every call would never be === the
// previous snapshot, which trips React's "getSnapshot should be cached"
// warning and can loop. Callers parse it themselves (memoized on the string).

const listeners = new Set<() => void>()

function readRaw(): string {
  try {
    return localStorage.getItem(MODULES_STORAGE_KEY) ?? "[]"
  } catch {
    return "[]"
  }
}

function notify() {
  for (const listener of listeners) listener()
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange)
  window.addEventListener("storage", onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
    window.removeEventListener("storage", onStoreChange)
  }
}

function getSnapshot(): string {
  return readRaw()
}

function getServerSnapshot(): string {
  return "[]"
}

function parseIds(raw: string): ModuleId[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function useDisabledModules() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const disabled = useMemo(() => new Set(parseIds(raw)), [raw])

  const setDisabled = useCallback((id: ModuleId, isDisabled: boolean) => {
    const current = new Set(parseIds(readRaw()))
    if (isDisabled) {
      current.add(id)
    } else {
      current.delete(id)
    }
    try {
      localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify([...current]))
    } catch {}
    notify()
  }, [])

  const isEnabled = useCallback(
    (id: ModuleId) => !disabled.has(id),
    [disabled]
  )

  return { disabled, isEnabled, setDisabled }
}
