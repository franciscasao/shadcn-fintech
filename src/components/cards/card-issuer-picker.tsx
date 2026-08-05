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
import { InstitutionLogo } from "@/components/accounts/institution-logo"
import { INSTITUTION_GROUPS, PH_INSTITUTIONS, type InstitutionTemplate } from "@/lib/ph-institutions"
import { issuesCards } from "@/lib/ph-cards"
import type { BankAccount } from "@/lib/types"

export type CardIssuerSelection =
  | { kind: "account"; account: BankAccount }
  | { kind: "template"; template: InstitutionTemplate }
  | { kind: "custom" }

interface CardIssuerPickerProps {
  /** The user's linked accounts — issuer + funding account come from these. */
  accounts: BankAccount[]
  onSelect: (selection: CardIssuerSelection) => void
}

export function CardIssuerPicker({ accounts, onSelect }: CardIssuerPickerProps) {
  // Only accounts backed by a card-issuing institution (or a custom
  // institution, which we treat as permissive) can fund a new card —
  // brokerage/crypto accounts are excluded.
  const cardFundingAccounts = accounts.filter((a) => {
    if (!a.templateId) return true
    const template = PH_INSTITUTIONS.find((t) => t.id === a.templateId)
    return template ? issuesCards(template) : true
  })

  return (
    <Command className="rounded-lg! border">
      <CommandInput placeholder="Search accounts and banks…" />
      <CommandList className="max-h-80">
        <CommandEmpty>No accounts or institutions found.</CommandEmpty>
        {cardFundingAccounts.length > 0 && (
          <CommandGroup heading="Your accounts">
            {cardFundingAccounts.map((account) => (
              <CommandItem
                key={account.id}
                value={`${account.name} ${account.institution}`}
                onSelect={() => onSelect({ kind: "account", account })}
              >
                <InstitutionLogo src={account.institutionLogo} />
                <span className="flex-1 truncate">{account.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {account.institution} {account.accountNumber}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {INSTITUTION_GROUPS.map((group) => {
          const items = PH_INSTITUTIONS.filter((i) => i.group === group.id && issuesCards(i))
          if (items.length === 0) return null
          return (
            <CommandGroup key={group.id} heading={group.label}>
              {items.map((template) => (
                <CommandItem
                  key={template.id}
                  value={template.name}
                  onSelect={() => onSelect({ kind: "template", template })}
                >
                  <InstitutionLogo src={template.logo} />
                  <span className="flex-1 truncate">{template.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )
        })}
        <CommandGroup heading="Other">
          <CommandItem value="Custom issuer" onSelect={() => onSelect({ kind: "custom" })}>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
              <PlusCircleIcon className="size-3.5 text-muted-foreground" />
            </div>
            <span>Custom issuer</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  )
}
