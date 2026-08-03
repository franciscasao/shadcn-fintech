"use client"

import { useState } from "react"
import Image from "next/image"
import {
  TrendingUpIcon,
  TrendingDownIcon,
  ClockIcon,
  BuildingIcon,
  ShieldCheckIcon,
  ShieldOffIcon,
} from "lucide-react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"
import { creditingLabel, formatRate } from "@/lib/interest"
import type { BankAccount } from "@/lib/types"

interface AccountCardProps {
  account: BankAccount
  index: number
  onSelect?: (account: BankAccount) => void
}

const fmt = (n: number, currency = "₱") =>
  `${currency}${new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n))}`

export function AccountCard({ account, index, onSelect }: AccountCardProps) {
  const [imgError, setImgError] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={() => onSelect?.(account)}
      className="group relative cursor-pointer overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow hover:shadow-md"
    >
      {/* Colored left border */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          account.color
        )}
      />

      <div className="p-4 pl-5">
        {/* Institution row */}
        <div className="flex items-center gap-2">
          {imgError ? (
            <div className="flex size-8 items-center justify-center rounded-full bg-muted">
              <BuildingIcon className="size-4 text-muted-foreground" />
            </div>
          ) : (
            <Image
              src={account.institutionLogo}
              alt={account.institution}
              width={32}
              height={32}
              unoptimized
              className="size-8 rounded-full bg-muted object-cover"
              onError={() => setImgError(true)}
            />
          )}
          <span className="text-xs text-muted-foreground">
            {account.institution}
          </span>
        </div>

        {/* Account name + number */}
        <div className="mt-3">
          <p className="text-sm font-semibold">{account.name}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {account.accountNumber}
          </p>
        </div>

        {/* Balance */}
        <p className="mt-3 tabular-nums text-xl font-bold tracking-tight">
          {fmt(account.balance, account.currency)}
        </p>

        {/* Interest & deposit insurance */}
        {(account.interestRate != null || account.creditingFrequency !== "none") && (
          <p className="mt-1 text-xs text-muted-foreground">
            {formatRate(account.interestRate)} ·{" "}
            {creditingLabel(account.creditingFrequency, account.creditingTiming)}
          </p>
        )}
        {account.templateId && (
          <span
            className={cn(
              "mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              account.pdicInsured
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-muted text-muted-foreground"
            )}
          >
            {account.pdicInsured ? (
              <ShieldCheckIcon className="size-3" />
            ) : (
              <ShieldOffIcon className="size-3" />
            )}
            {account.pdicInsured ? "PDIC insured" : "Not insured"}
          </span>
        )}

        {/* Change badge + last activity */}
        <div className="mt-2 flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              account.change >= 0
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-rose-500/10 text-rose-500"
            )}
          >
            {account.change >= 0 ? (
              <TrendingUpIcon className="size-3" />
            ) : (
              <TrendingDownIcon className="size-3" />
            )}
            <span className="tabular-nums">
              {account.change >= 0 ? "+" : "-"}
              {fmt(account.change, account.currency)}{" "}
              ({Math.abs(account.changePercent).toFixed(1)}%)
            </span>
          </span>

          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ClockIcon className="size-3" />
            {account.lastActivity}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
