"use client"

import { CheckIcon, FileTextIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// The step machine (import-statement-page-client.tsx) used to communicate
// progress only through a swapped <h1>/description — there was no way to
// see where you were in the flow, what file was loaded, or which account
// you were about to write to. This rail fixes both: a step list on top,
// and the run's context (file, target, rows read) pinned below it so it
// stays visible through review and commit instead of disappearing after
// step 1.
//
// "Match columns" only appears once a file has actually needed manual
// mapping (see `mappingNeeded`) — the rail shouldn't promise a step most
// imports never hit.

export type ImportStep = "upload" | "map" | "review" | "done"

const STEP_LABELS: Record<ImportStep, string> = {
  upload: "Upload",
  map: "Match columns",
  review: "Review",
  done: "Done",
}

function stepOrder(mappingNeeded: boolean): ImportStep[] {
  return mappingNeeded ? ["upload", "map", "review", "done"] : ["upload", "review", "done"]
}

interface ImportRailProps {
  step: ImportStep
  mappingNeeded: boolean
  file: File | null
  targetLabel: string | null
  targetSubLabel: string | null
  rowCount: number | null
  onNavigate: (step: ImportStep) => void
}

export function ImportRail({
  step,
  mappingNeeded,
  file,
  targetLabel,
  targetSubLabel,
  rowCount,
  onNavigate,
}: ImportRailProps) {
  const order = stepOrder(mappingNeeded)
  const currentIndex = order.indexOf(step)

  return (
    <>
      {/* Desktop rail */}
      <div className="hidden w-52 shrink-0 flex-col gap-6 lg:flex">
        <ol className="flex flex-col">
          {order.map((s, i) => {
            const status = i < currentIndex ? "done" : i === currentIndex ? "current" : "pending"
            const isLast = i === order.length - 1
            return (
              <li key={s} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    disabled={status !== "done"}
                    onClick={() => onNavigate(s)}
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-semibold transition-colors",
                      status === "done" && "cursor-pointer bg-primary text-primary-foreground hover:bg-primary/80",
                      status === "current" && "ring-2 ring-primary text-primary",
                      status === "pending" && "bg-muted text-muted-foreground"
                    )}
                    aria-current={status === "current" ? "step" : undefined}
                    aria-label={`${STEP_LABELS[s]}${status === "done" ? " — go back" : ""}`}
                  >
                    {status === "done" ? <CheckIcon className="size-3" /> : i + 1}
                  </button>
                  {!isLast && <div className={cn("my-0.5 h-6 w-px", status === "done" ? "bg-primary" : "bg-border")} />}
                </div>
                <span
                  className={cn(
                    "pt-0.5 text-sm",
                    status === "current" && "font-medium text-foreground",
                    status === "done" && "text-foreground",
                    status === "pending" && "text-muted-foreground"
                  )}
                >
                  {STEP_LABELS[s]}
                </span>
              </li>
            )
          })}
        </ol>

        {file && (
          <>
            <div className="h-px bg-border" />
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <p className="truncate text-xs font-medium text-foreground">{file.name}</p>
              </div>
              {targetLabel && (
                <div>
                  <p className="text-xs text-muted-foreground">Importing to</p>
                  <p className="text-sm font-medium text-foreground">{targetLabel}</p>
                  {targetSubLabel && <p className="text-xs text-muted-foreground">{targetSubLabel}</p>}
                </div>
              )}
              {rowCount !== null && (
                <div>
                  <p className="text-xs text-muted-foreground">Rows read</p>
                  <p className="text-sm font-medium tabular-nums text-foreground">{rowCount}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Mobile step strip */}
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:hidden">
        {order.map((s, i) => {
          const status = i < currentIndex ? "done" : i === currentIndex ? "current" : "pending"
          return (
            <button
              key={s}
              type="button"
              disabled={status !== "done"}
              onClick={() => onNavigate(s)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                status === "current" && "bg-primary text-primary-foreground",
                status === "done" && "bg-muted text-foreground",
                status === "pending" && "text-muted-foreground"
              )}
            >
              {status === "done" ? <CheckIcon className="size-3" /> : <span className="tabular-nums">{i + 1}</span>}
              {STEP_LABELS[s]}
            </button>
          )
        })}
      </div>
    </>
  )
}
