"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PlusIcon, MoreHorizontalIcon, PencilIcon, TrashIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/empty-state"
import { budgetIconMap } from "@/components/budgets/budget-icons"
import {
  CategoryDialog,
  type CategoryDialogTarget,
  type CategoryFormInput,
} from "@/components/settings/category-dialog"
import { DeleteCategoryDialog } from "@/components/settings/delete-category-dialog"
import type { Category } from "@/lib/types"

interface CategoriesTabProps {
  categories: Category[]
}

export function CategoriesTab({ categories }: CategoriesTabProps) {
  const router = useRouter()
  const [dialogTarget, setDialogTarget] = useState<CategoryDialogTarget>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  async function handleCreate(input: CategoryFormInput) {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.error ?? "Failed to create category")
    }
    router.refresh()
  }

  async function handleUpdate(id: string, input: CategoryFormInput) {
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.error ?? "Failed to update category")
    }
    router.refresh()
  }

  async function handleDelete(id: string, reassignToId: string) {
    const res = await fetch(`/api/categories/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reassignTo: Number(reassignToId) }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.error ?? "Failed to delete category")
    }
    router.refresh()
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>
            Manage the categories transactions are filed under
          </CardDescription>
          <CardAction>
            <Button size="sm" onClick={() => setDialogTarget("new")}>
              <PlusIcon className="size-4" />
              New category
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <EmptyState
              title="No categories yet"
              description="Create a category to start filing transactions under it."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Budget bucket</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={c.color}>{budgetIconMap[c.iconName]}</span>
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.budgetBucket ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.transactionCount}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon-xs" />}
                        >
                          <MoreHorizontalIcon className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="bottom" align="end">
                          <DropdownMenuItem onSelect={() => setDialogTarget(c)}>
                            <PencilIcon className="size-3.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeleteTarget(c)}
                          >
                            <TrashIcon className="size-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CategoryDialog
        target={dialogTarget}
        onOpenChange={(open) => !open && setDialogTarget(null)}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />
      <DeleteCategoryDialog
        category={deleteTarget}
        categories={categories}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onDelete={handleDelete}
      />
    </>
  )
}
