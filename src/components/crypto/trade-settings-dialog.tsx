"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ZapIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

interface TradeSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const slippagePresets = [0.1, 0.5, 1.0]

export function TradeSettingsDialog({ open, onOpenChange }: TradeSettingsDialogProps) {
  const [slippage, setSlippage] = useState(0.5)
  const [custom, setCustom] = useState("")
  const [gasMode, setGasMode] = useState<"slow" | "standard" | "fast">("standard")
  const [expertMode, setExpertMode] = useState(false)

  function handleSave() {
    onOpenChange(false)
    toast.success("Trade settings saved", {
      description: `Slippage ${slippage}% · Gas ${gasMode}`,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trade settings</DialogTitle>
          <DialogDescription>
            Configure slippage tolerance and gas preferences for your trades.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Slippage */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Slippage tolerance</label>
              <span className="text-xs tabular-nums font-medium">{slippage}%</span>
            </div>
            <div className="flex gap-1.5">
              {slippagePresets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setSlippage(p)
                    setCustom("")
                  }}
                  className={cn(
                    "flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                    slippage === p && !custom
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70",
                  )}
                >
                  {p}%
                </button>
              ))}
              <input
                type="number"
                step="0.1"
                value={custom}
                onChange={(e) => {
                  setCustom(e.target.value)
                  const v = parseFloat(e.target.value)
                  if (!isNaN(v)) setSlippage(v)
                }}
                placeholder="Custom"
                className="w-20 rounded-lg border bg-background px-2 py-1.5 text-xs tabular-nums"
              />
            </div>
            <Slider
              value={[slippage]}
              onValueChange={(v) => {
                const next = Array.isArray(v) ? v[0] : v
                setSlippage(next)
                setCustom("")
              }}
              min={0.1}
              max={5}
              step={0.1}
            />
          </div>

          {/* Gas mode */}
          <div className="space-y-2.5">
            <label className="text-xs font-medium">Transaction speed</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: "slow", label: "Slow", desc: "~5 min" },
                { id: "standard", label: "Standard", desc: "~1 min" },
                { id: "fast", label: "Fast", desc: "~15 s" },
              ] as const).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setGasMode(m.id)}
                  className={cn(
                    "rounded-lg border p-2.5 text-left transition-all",
                    gasMode === m.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "hover:bg-muted/50",
                  )}
                >
                  <p className="text-xs font-semibold">{m.label}</p>
                  <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Expert mode */}
          <div className="flex items-start justify-between rounded-lg border p-3">
            <div className="space-y-0.5 pr-3">
              <div className="flex items-center gap-1.5">
                <ZapIcon className="size-3.5 text-amber-500" />
                <p className="text-xs font-semibold">Expert mode</p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Disable confirmation prompts and high-slippage warnings.
              </p>
            </div>
            <Switch checked={expertMode} onCheckedChange={setExpertMode} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
