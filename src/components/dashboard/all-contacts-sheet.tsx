"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"
import { SearchIcon, SendIcon } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { contacts } from "@/data/seed"

interface AllContactsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedId: string
  onSelect: (id: string) => void
}

export function AllContactsSheet({
  open,
  onOpenChange,
  selectedId,
  onSelect,
}: AllContactsSheetProps) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return contacts
    return contacts.filter((c) => c.name.toLowerCase().includes(q))
  }, [query])

  function handlePick(id: string, name: string) {
    onSelect(id)
    onOpenChange(false)
    toast(`Contact selected`, { description: `Ready to send to ${name}.` })
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setQuery("")
      }}
    >
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>All contacts</SheetTitle>
          <SheetDescription>
            {contacts.length} people. Pick one to load them into Quick Transfer.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-2">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name..."
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No matches for &ldquo;{query}&rdquo;
            </p>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((c) => {
                const isSelected = c.id === selectedId
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handlePick(c.id, c.name)}
                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/50 ${
                      isSelected ? "bg-primary/5" : ""
                    }`}
                  >
                    <Avatar className="size-9">
                      <AvatarImage src={c.avatar} alt={c.name} />
                      <AvatarFallback className="text-xs">
                        {c.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">@{c.name.toLowerCase().replace(/\s+/g, "")}</p>
                    </div>
                    {isSelected ? (
                      <span className="text-[11px] font-medium text-primary">Selected</span>
                    ) : (
                      <SendIcon className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="border-t p-4">
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
