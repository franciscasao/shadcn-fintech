"use client"

import { useState } from "react"
import { PlusIcon, CheckIcon } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { AddAccountDialog } from "@/components/accounts/add-account-dialog"
import type { NewAccountInput } from "@/lib/ph-institutions"

export type { NewAccountInput }

interface AddAccountProps {
  onAdd: (input: NewAccountInput) => Promise<void>
}

type CardState = "idle" | "success"

export function AddAccount({ onAdd }: AddAccountProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [cardState, setCardState] = useState<CardState>("idle")

  async function handleAdd(input: NewAccountInput) {
    await onAdd(input)
    // Only reached on success — a thrown error propagates to the dialog's
    // own try/catch instead, so it can stay open and show a retry message.
    setDialogOpen(false)
    setCardState("success")
    setTimeout(() => setCardState("idle"), 1500)
  }

  return (
    <>
      <Card
        className={cn(
          "flex min-h-[180px] items-center justify-center border-2 border-dashed ring-0 transition-colors",
          cardState === "idle" && "cursor-pointer hover:border-primary/40 hover:bg-muted/30"
        )}
        onClick={() => cardState === "idle" && setDialogOpen(true)}
      >
        <CardContent className="flex w-full flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {cardState === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-2 text-muted-foreground"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                  <PlusIcon className="size-5" />
                </div>
                <span className="text-sm font-medium">Link New Account</span>
              </motion.div>
            )}

            {cardState === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-2 text-emerald-500"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckIcon className="size-5" />
                </div>
                <span className="text-sm font-medium">Connected!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <AddAccountDialog open={dialogOpen} onOpenChange={setDialogOpen} onAdd={handleAdd} />
    </>
  )
}
