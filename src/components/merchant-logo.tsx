import Image from "next/image"

import { cn } from "@/lib/utils"

interface MerchantLogoProps {
  logo: string
  merchant: string
  size?: number
  className?: string
}

/** Renders a merchant's brand logo, falling back to an initials tile when
 * none is on file — e.g. manually-entered transactions (see
 * @/server/mutations/transactions) have no logo to look up. next/image
 * throws on an empty `src`, so this guard is required, not cosmetic. */
export function MerchantLogo({ logo, merchant, size = 32, className }: MerchantLogoProps) {
  if (!logo) {
    return (
      <div
        style={{ width: size, height: size }}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground",
          className
        )}
      >
        {merchant.trim().charAt(0).toUpperCase() || "?"}
      </div>
    )
  }

  return (
    <Image
      src={logo}
      alt={merchant}
      width={size}
      height={size}
      className={cn("shrink-0 rounded-lg object-cover", className)}
      style={{ width: size, height: size }}
      unoptimized
    />
  )
}
