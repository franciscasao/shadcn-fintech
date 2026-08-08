"use client"

import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ColumnMapping } from "@/lib/import/types"

// Column mapping used to be five plain selects — pick a header string for
// "Date column", "Amount column", etc — with the sample rows the server
// already sent along (`sampleRows`) fetched into state and never rendered.
// You were matching columns blind. This renders the actual sample data as a
// table and turns each header cell into a role picker, so the mapping is
// made on top of what you're mapping.

export type MappingRole = "date" | "description" | "amount" | "debit" | "credit" | "balance" | "ignore"

const ROLE_LABELS: Record<MappingRole, string> = {
  date: "Date",
  description: "Description",
  amount: "Amount",
  debit: "Debit",
  credit: "Credit",
  balance: "Balance",
  ignore: "Ignore",
}

const ASSIGNABLE_ROLES: MappingRole[] = ["date", "description", "amount", "debit", "credit", "balance", "ignore"]

export function emptyRoles(headerCount: number): MappingRole[] {
  return Array.from({ length: headerCount }, () => "ignore")
}

export function rolesToMapping(roles: MappingRole[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {}
  roles.forEach((role, index) => {
    if (role === "ignore") return
    mapping[role] = index
  })
  return mapping
}

interface ColumnMapTableProps {
  headers: string[]
  sampleRows: string[][]
  roles: MappingRole[]
  onRolesChange: (roles: MappingRole[]) => void
}

export function ColumnMapTable({ headers, sampleRows, roles, onRolesChange }: ColumnMapTableProps) {
  function setRole(colIndex: number, role: MappingRole) {
    onRolesChange(
      roles.map((r, i) => {
        if (i === colIndex) return role
        // Every role except "ignore" can only live on one column at a time —
        // picking it here bumps whichever column held it before.
        if (role !== "ignore" && r === role) return "ignore"
        return r
      })
    )
  }

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div className="max-h-72 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="sticky top-0 z-10 bg-card">
              {headers.map((header, colIndex) => (
                <TableHead key={colIndex} className="min-w-36 py-2">
                  <div className="flex flex-col gap-1">
                    <span className="truncate text-xs font-normal text-muted-foreground" title={header || undefined}>
                      {header || `Column ${colIndex + 1}`}
                    </span>
                    <Select value={roles[colIndex]} onValueChange={(v) => v && setRole(colIndex, v as MappingRole)}>
                      <SelectTrigger size="sm" className="w-full">
                        <SelectValue>{(v: string) => ROLE_LABELS[v as MappingRole]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {ASSIGNABLE_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sampleRows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {headers.map((_, colIndex) => (
                  <TableCell
                    key={colIndex}
                    className={cn(
                      "font-mono text-xs",
                      roles[colIndex] === "ignore" ? "text-muted-foreground" : "text-foreground"
                    )}
                  >
                    {row[colIndex] || "—"}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
