"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { KycData } from "@/components/kyc/kyc-page-client"

const countries = [
  "United States", "United Kingdom", "France", "Germany", "Spain", "Italy",
  "Canada", "Australia", "Netherlands", "Sweden", "Singapore", "Japan",
]

interface PersonalStepProps {
  data: KycData
  onChange: (patch: Partial<KycData>) => void
  onBack: () => void
  onNext: () => void
}

export function PersonalStep({ data, onChange, onBack, onNext }: PersonalStepProps) {
  const valid =
    data.fullName.trim().length >= 2 &&
    data.dob.length > 0 &&
    data.nationality.length > 0 &&
    data.residence.length > 0
  // Lazy useState initializer runs once on mount; OK to read clock here.
  const [maxDob] = useState(
    () => new Date(Date.now() - 18 * 365 * 24 * 3600 * 1000).toISOString().split("T")[0],
  )

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="space-y-4"
    >
      <div>
        <h2 className="text-lg font-semibold">Personal information</h2>
        <p className="text-sm text-muted-foreground">
          Use your legal name as it appears on your ID.
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium" htmlFor="fullname">
            Full legal name
          </label>
          <Input
            id="fullname"
            value={data.fullName}
            onChange={(e) => onChange({ fullName: e.target.value })}
            placeholder="Alex Morgan"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium" htmlFor="dob">
            Date of birth
          </label>
          <Input
            id="dob"
            type="date"
            value={data.dob}
            onChange={(e) => onChange({ dob: e.target.value })}
            max={maxDob}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Nationality</label>
            <Select
              value={data.nationality}
              onValueChange={(v) => v && onChange({ nationality: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose..." />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Country of residence</label>
            <Select
              value={data.residence}
              onValueChange={(v) => v && onChange({ residence: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose..." />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
