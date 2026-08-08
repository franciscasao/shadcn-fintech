"use client"

import Image from "next/image"
import { motion, AnimatePresence } from "motion/react"
import { SnowflakeIcon, WifiIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { InstitutionLogo } from "@/components/accounts/institution-logo"
import type { CardData } from "@/lib/types"

interface InteractiveCardProps {
  card: CardData
  frozen: boolean
}

export function InteractiveCard({
  card,
  frozen,
}: InteractiveCardProps) {
  return (
    <div className="relative aspect-[1.586/1] w-full sm:max-w-[400px]">
      <div
        className={cn(
          "flex h-full w-full flex-col justify-between rounded-2xl p-5",
          card.color,
        )}
      >
        {/* Top row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {card.issuerLogo && <InstitutionLogo src={card.issuerLogo} size={22} />}
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-tight">{card.issuer || card.name}</span>
              {card.issuer && (
                <span className="text-[10px] leading-tight opacity-70">{card.name}</span>
              )}
            </div>
          </div>
          <Image
            src={card.network === "visa" ? "/logos/visa-com.svg" : "/logos/mastercard-com.svg"}
            alt={card.network}
            width={48}
            height={32}
            className="h-8 w-auto object-contain"
          />
        </div>

        {/* Chip + NFC */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-11 rounded-md bg-gradient-to-br from-amber-300 to-amber-500 opacity-80" />
          <WifiIcon className="size-5 rotate-90 opacity-60" />
        </div>

        {/* Card number */}
        <p className="font-mono text-base tracking-widest tabular-nums">
          **** **** **** {card.last4}
        </p>

        {/* Bottom row */}
        <div className="flex items-end justify-between">
          <span className="text-xs font-medium uppercase tracking-wide">
            {card.holder}
          </span>
          <span className="text-xs tabular-nums">{card.expiry}</span>
        </div>
      </div>

      {/* ── Freeze Overlay ── */}
      <AnimatePresence>
        {frozen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 rounded-2xl bg-background/70 backdrop-blur-sm"
          >
            <SnowflakeIcon className="size-8 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Card Frozen
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
