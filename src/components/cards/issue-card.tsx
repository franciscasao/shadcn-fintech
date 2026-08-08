"use client"

import { useCallback, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { PlusIcon } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { InstitutionLogo } from "@/components/accounts/institution-logo"
import { AddCardDialog } from "@/components/cards/add-card-dialog"
import type { NewCardInput } from "@/lib/ph-cards"
import type { BankAccount, CardData } from "@/lib/types"

interface IssueCardProps {
  accounts: BankAccount[]
  holderName: string
  /** Returns the server-created card so the success panel can show real values. */
  onCardCreated: (input: NewCardInput) => Promise<CardData>
}

type Step = "idle" | "success"

export function IssueCard({ accounts, holderName, onCardCreated }: IssueCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [step, setStep] = useState<Step>("idle")
  const [newCard, setNewCard] = useState<CardData | null>(null)

  const handleAdd = useCallback(
    async (input: NewCardInput) => {
      const card = await onCardCreated(input)
      // Only reached on success — a thrown error propagates to the dialog's
      // own try/catch instead, so it can stay open and show a retry message.
      setDialogOpen(false)
      setNewCard(card)
      setStep("success")
      setTimeout(() => {
        setStep("idle")
        setNewCard(null)
      }, 4000)
    },
    [onCardCreated]
  )

  return (
    <Card className="py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-sm">Issue a Card</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <AnimatePresence mode="wait">
          {/* ── Idle ── */}
          {step === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <Button onClick={() => setDialogOpen(true)} className="w-full">
                <PlusIcon className="size-4" />
                Issue a Card
              </Button>
            </motion.div>
          )}

          {/* ── Success ── */}
          {step === "success" && newCard && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  {newCard.issuerLogo && <InstitutionLogo src={newCard.issuerLogo} size={18} />}
                  <p className="text-xs font-medium text-muted-foreground">
                    {newCard.issuer || "Card issued"}
                  </p>
                </div>
                <motion.p
                  className="text-sm font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6 }}
                >
                  {newCard.name}
                </motion.p>
                <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                  •••• {newCard.last4}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      <AddCardDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        accounts={accounts}
        holderName={holderName}
        onAdd={handleAdd}
      />
    </Card>
  )
}
