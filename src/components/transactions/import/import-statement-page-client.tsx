"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LoaderIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ImportDropzone } from "@/components/transactions/import/import-dropzone"
import { ImportPreviewTable } from "@/components/transactions/import/import-preview-table"
import { ImportRail, type ImportStep } from "@/components/transactions/import/import-rail"
import { ImportSummary, type RowFilter } from "@/components/transactions/import/import-summary"
import { ImportReceipt } from "@/components/transactions/import/import-receipt"
import type { BankAccount, CardData } from "@/lib/types"
import type { DraftTransaction, ImportResult, ImportRow, PreviewResponse } from "@/lib/import/types"

// Page-level version of what was originally a dialog — the preview table
// wants real screen width (7+ editable columns), and a page gives it that
// plus a normal back/breadcrumb escape hatch instead of a modal's [x]. Same
// hand-rolled state/submit/error pattern as add-transaction-dialog.tsx, laid
// out as a rail + work-surface shell (see settings-page-client.tsx) instead
// of a single centered column — the run's file/target/step stay visible
// through the whole flow instead of disappearing after step 1.

const NO_CARD = "none"

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

interface ImportStatementPageClientProps {
  categoryNames: string[]
  accounts: BankAccount[]
  cards: CardData[]
}

export function ImportStatementPageClient({
  categoryNames,
  accounts,
  cards,
}: ImportStatementPageClientProps) {
  const router = useRouter()

  const [step, setStep] = useState<ImportStep>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [accountId, setAccountId] = useState("")
  const [cardId, setCardId] = useState(NO_CARD)

  const [rows, setRows] = useState<DraftTransaction[]>([])
  const [unmatchedLines, setUnmatchedLines] = useState<string[] | null>(null)
  const [rowFilter, setRowFilter] = useState<RowFilter>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Same credit-card invariant as add-transaction-dialog: a credit card
  // purchase has no funding account, so clear + disable Account whenever a
  // credit card is picked.
  const selectedCard = cardId !== NO_CARD ? cards.find((c) => c.id === cardId) : undefined
  const isCreditCard = selectedCard?.product === "credit"

  useEffect(() => {
    if (isCreditCard) setAccountId("")
  }, [isCreditCard])

  // Pick a sensible default account on mount, in case it was empty.
  useEffect(() => {
    setAccountId((id) => id || accounts[0]?.id || "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const targetLabel = isCreditCard
    ? (selectedCard ? `${selectedCard.name} •••• ${selectedCard.last4}` : null)
    : (accounts.find((a) => a.id === accountId)?.name ?? null)
  const targetSubLabel = isCreditCard
    ? "No funding account"
    : (selectedCard ? `+ ${selectedCard.name} •••• ${selectedCard.last4}` : null)

  function resetToUpload() {
    setStep("upload")
    setFile(null)
    setCardId(NO_CARD)
    setRows([])
    setUnmatchedLines(null)
    setRowFilter(null)
    setNotice(null)
    setResult(null)
    setError(null)
  }

  function backToFileSelection() {
    setStep("upload")
    setFile(null)
    setError(null)
  }

  const canPreview = file !== null && (isCreditCard || accountId !== "")

  async function requestPreview() {
    if (!file) return
    setSubmitting(true)
    setError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      if (!isCreditCard && accountId) form.append("accountId", accountId)
      if (cardId !== NO_CARD) form.append("cardId", cardId)

      const res = await fetch("/api/transactions/import/preview", { method: "POST", body: form })
      const data: PreviewResponse = await res.json()

      if (!data.ok) {
        setError(data.error)
        return
      }

      setRows(data.rows)
      setNotice(data.notice ?? null)
      setUnmatchedLines(data.unmatchedLines ?? null)
      setRowFilter(null)
      setStep("review")
    } catch {
      setError("Couldn't read that file — try again")
    } finally {
      setSubmitting(false)
    }
  }

  function handleFlipAll() {
    setRows((prev) => prev.map((r) => ({ ...r, type: r.type === "expense" ? "income" : "expense" })))
  }

  function handleBulkCategory(category: string) {
    setRows((prev) => prev.map((r) => (r.include && !r.category ? { ...r, category } : r)))
  }

  const includedRows = rows.filter((r) => r.include)
  const canImport =
    includedRows.length > 0 && includedRows.every((r) => !r.issues.some((i) => i.level === "error"))

  async function handleImport() {
    if (!canImport || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const payload: ImportRow[] = includedRows.map((r) => ({
        date: r.date,
        merchant: r.merchant.trim(),
        amount: r.amount,
        type: r.type,
        category: r.category,
        status: "completed",
      }))
      const res = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: payload,
          accountId: isCreditCard ? null : accountId ? Number(accountId) : null,
          cardId: cardId !== NO_CARD ? Number(cardId) : undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? "Couldn't import transactions")
      }
      const data: ImportResult = await res.json()
      setResult(data)
      setStep("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't import transactions — try again")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Import transactions</h1>
        <p className="text-sm text-muted-foreground">
          Upload a MariBank credit card or savings e-Statement PDF — we&apos;ll draft the transactions for you to
          review before anything&apos;s written to your ledger.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:gap-6">
        <ImportRail
          step={step}
          file={file}
          targetLabel={targetLabel}
          targetSubLabel={targetSubLabel}
          rowCount={step === "review" || step === "done" ? rows.length : null}
          onNavigate={(s) => {
            setError(null)
            setStep(s)
          }}
        />

        <div className="min-w-0 flex-1">
          {step === "upload" && (
            <div className="flex max-w-xl flex-col gap-4">
              <ImportDropzone file={file} onFileSelected={setFile} />

              <div className="grid grid-cols-2 gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
                <Field label="Account">
                  <Select value={accountId} onValueChange={(v) => v && setAccountId(v)} disabled={isCreditCard}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isCreditCard ? "Charged to card" : "Select account"}>
                        {(v: string) => accounts.find((a) => a.id === v)?.name ?? "Select account"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isCreditCard && (
                    <span className="text-xs text-muted-foreground">Not needed — this statement is a credit card.</span>
                  )}
                </Field>
                <Field label="Card (optional)">
                  <Select value={cardId} onValueChange={(v) => v && setCardId(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(v: string) =>
                          v === NO_CARD
                            ? "No card"
                            : (() => {
                                const c = cards.find((c) => c.id === v)
                                return c ? `${c.name} •••• ${c.last4}` : "No card"
                              })()
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CARD}>No card</SelectItem>
                      {cards.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} •••• {c.last4}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  nativeButton={false}
                  render={<Link href="/transactions" />}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!canPreview || submitting}
                  onClick={() => requestPreview()}
                >
                  {submitting ? (
                    <>
                      <LoaderIcon className="size-4 animate-spin" />
                      Reading…
                    </>
                  ) : (
                    "Preview"
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="flex flex-col gap-3">
              {rows.length === 0 ? (
                <div className="max-w-xl rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                  <p className="mb-1 text-sm font-medium text-foreground">Nothing matched a transaction pattern.</p>
                  {unmatchedLines && unmatchedLines.length > 0 ? (
                    <>
                      <p className="mb-2 text-sm text-muted-foreground">Here&apos;s what we read from the file:</p>
                      <pre className="mb-3 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-2 text-xs">
                        {unmatchedLines.join("\n")}
                      </pre>
                    </>
                  ) : (
                    <p className="mb-3 text-sm text-muted-foreground">
                      Try a different file — only MariBank credit card or savings e-Statement PDFs are supported.
                    </p>
                  )}
                  <Button variant="outline" size="sm" onClick={backToFileSelection}>
                    Choose a different file
                  </Button>
                </div>
              ) : (
                <>
                  <ImportSummary
                    rows={rows}
                    categoryNames={categoryNames}
                    filter={rowFilter}
                    onFilterChange={setRowFilter}
                    onFlipAll={handleFlipAll}
                    onBulkCategory={handleBulkCategory}
                    notice={notice}
                  />
                  <ImportPreviewTable
                    rows={rows}
                    onRowsChange={setRows}
                    categoryNames={categoryNames}
                    filter={rowFilter}
                  />
                </>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex max-w-xl gap-2 pt-1">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setStep("upload")}>
                  Back
                </Button>
                <Button size="sm" className="flex-1" disabled={!canImport || submitting} onClick={handleImport}>
                  {submitting ? (
                    <>
                      <LoaderIcon className="size-4 animate-spin" />
                      Importing…
                    </>
                  ) : (
                    `Import ${includedRows.length} transaction${includedRows.length === 1 ? "" : "s"}`
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === "done" && result && (
            <ImportReceipt
              result={result}
              onImportAnother={resetToUpload}
              onDone={() => {
                router.push("/transactions")
                router.refresh()
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
