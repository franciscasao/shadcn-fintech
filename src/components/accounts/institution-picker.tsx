"use client"

import { PlusCircleIcon } from "lucide-react"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { formatRate } from "@/lib/interest"
import { INSTITUTION_GROUPS, PH_INSTITUTIONS, type InstitutionTemplate } from "@/lib/ph-institutions"
import { InstitutionLogo } from "@/components/accounts/institution-logo"

interface InstitutionPickerProps {
  /** `null` means the user picked "Custom institution" rather than a template. */
  onSelect: (template: InstitutionTemplate | null) => void
}

export function InstitutionPicker({ onSelect }: InstitutionPickerProps) {
  return (
    <Command className="rounded-lg! border">
      <CommandInput placeholder="Search banks, digital banks, e-wallets…" />
      <CommandList className="max-h-80">
        <CommandEmpty>No institutions found.</CommandEmpty>
        {INSTITUTION_GROUPS.map((group) => {
          const items = PH_INSTITUTIONS.filter((i) => i.group === group.id)
          if (items.length === 0) return null
          return (
            <CommandGroup key={group.id} heading={group.label}>
              {items.map((template) => (
                <CommandItem
                  key={template.id}
                  value={template.name}
                  onSelect={() => onSelect(template)}
                >
                  <InstitutionLogo src={template.logo} />
                  <span className="flex-1 truncate">{template.name}</span>
                  {template.interestRate != null && (
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {formatRate(template.interestRate)}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )
        })}
        <CommandGroup heading="Other">
          <CommandItem value="Custom institution" onSelect={() => onSelect(null)}>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
              <PlusCircleIcon className="size-3.5 text-muted-foreground" />
            </div>
            <span>Custom institution</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  )
}
