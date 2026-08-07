"use client"

import * as React from "react"
import { PlusCircleIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"

export interface FacetedFilterOption {
  value: string
  label: string
  icon?: React.ReactNode
  count?: number
}

interface FacetedFilterProps {
  title: string
  options: FacetedFilterOption[]
  selected: string[]
  onChange: (next: string[]) => void
  searchable?: boolean
  className?: string
}

/** A multi-select filter button — a Command palette in a Popover, with a
 * checkmark and an optional count per option. Not a shadcn primitive (hence
 * living outside ui/), but generic enough to reuse anywhere a faceted filter
 * is needed — currently the transactions table's Category, Card, and
 * Account filters (see transactions/filters/more-filters.tsx).
 *
 * cmdk doesn't set `data-checked` on its own — it's passed explicitly below
 * so the checkmark already built into src/components/ui/command.tsx lights
 * up for selected options. */
export function FacetedFilter({
  title,
  options,
  selected,
  onChange,
  searchable = true,
  className,
}: FacetedFilterProps) {
  const selectedSet = new Set(selected)

  function toggle(value: string) {
    onChange(
      selectedSet.has(value) ? selected.filter((v) => v !== value) : [...selected, value]
    )
  }

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="outline" size="sm" className={cn("h-8 border-dashed", className)} />}
      >
        <PlusCircleIcon className="size-3.5 text-muted-foreground" />
        {title}
        {selected.length > 0 && (
          <Badge variant="secondary" className="ml-1 rounded-md px-1.5 font-normal tabular-nums">
            {selected.length}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          {searchable && <CommandInput placeholder={title} />}
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  data-checked={selectedSet.has(option.value)}
                  onSelect={() => toggle(option.value)}
                >
                  {option.icon}
                  <span className="truncate">{option.label}</span>
                  {option.count != null && (
                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                      {option.count}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            {selected.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onChange([])}
                    className="justify-center text-center text-muted-foreground"
                  >
                    Clear filter
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
