"use client"

import { useCallback, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { PlusIcon, CopyIcon, CheckIcon } from "lucide-react"
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
  const [copied, setCopied] = useState(false)

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
        setCopied(false)
      }, 4000)
    },
    [onCardCreated]
  )

  const handleCopy = useCallback(() => {
    if (!newCard) return
    navigator.clipboard.writeText(newCard.cardNumber.replace(/\s/g, ""))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [newCard])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Issue a Card</CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {/* ── Idle ── */}
          {step === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <p className="mb-4 text-sm text-muted-foreground">
                Issue a physical or virtual card from a linked account or any
                Philippine bank.
              </p>
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
                  className="font-mono text-sm font-medium tabular-nums"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6 }}
                >
                  {newCard.cardNumber}
                </motion.p>
                <div className="mt-2 flex gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Exp</p>
                    <p className="text-xs font-medium tabular-nums">
                      {newCard.expiry}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CVV</p>
                    <p className="text-xs font-medium tabular-nums">
                      {newCard.cvv}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopy()
                }}
              >
                {copied ? (
                  <>
                    <CheckIcon className="size-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <CopyIcon className="size-3.5" />
                    Copy Number
                  </>
                )}
              </Button>
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
