"use client"

import { useState } from "react"
import Image from "next/image"
import { BuildingIcon } from "lucide-react"

interface InstitutionLogoProps {
  src: string
  size?: number
}

/** Small circular institution/bank logo with a building-icon fallback on error. */
export function InstitutionLogo({ src, size = 24 }: InstitutionLogoProps) {
  const [error, setError] = useState(false)

  if (error || !src) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full bg-muted"
        style={{ width: size, height: size }}
      >
        <BuildingIcon className="size-3.5 text-muted-foreground" />
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      unoptimized
      className="shrink-0 rounded-full bg-muted object-cover"
      style={{ width: size, height: size }}
      onError={() => setError(true)}
    />
  )
}
