"use client"

import { motion } from "motion/react"
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { KycData } from "@/components/kyc/kyc-page-client"

interface AddressStepProps {
  data: KycData
  onChange: (patch: Partial<KycData>) => void
  onBack: () => void
  onNext: () => void
}

export function AddressStep({ data, onChange, onBack, onNext }: AddressStepProps) {
  const valid =
    data.street.trim().length >= 3 &&
    data.city.trim().length >= 2 &&
    data.postal.trim().length >= 2

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="space-y-4"
    >
      <div>
        <h2 className="text-lg font-semibold">Where do you live?</h2>
        <p className="text-sm text-muted-foreground">
          We may send a verification letter to confirm your address.
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium" htmlFor="street">
            Street address
          </label>
          <Input
            id="street"
            value={data.street}
            onChange={(e) => onChange({ street: e.target.value })}
            placeholder="123 Main St, Apt 4B"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="city">
              City
            </label>
            <Input
              id="city"
              value={data.city}
              onChange={(e) => onChange({ city: e.target.value })}
              placeholder="San Francisco"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="state">
              State / Region
            </label>
            <Input
              id="state"
              value={data.state}
              onChange={(e) => onChange({ state: e.target.value })}
              placeholder="CA"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="postal">
              Postal code
            </label>
            <Input
              id="postal"
              value={data.postal}
              onChange={(e) => onChange({ postal: e.target.value })}
              placeholder="94105"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="country2">
              Country
            </label>
            <Input
              id="country2"
              value={data.country}
              onChange={(e) => onChange({ country: e.target.value })}
              placeholder="United States"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onBack}>
          <ArrowLeftIcon className="size-3.5" />
          Back
        </Button>
        <Button className="flex-1 gap-1.5" onClick={onNext} disabled={!valid}>
          Continue
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
    </motion.div>
  )
}
