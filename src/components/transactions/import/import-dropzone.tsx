"use client"

import { useRef, useState, type ChangeEvent, type DragEvent } from "react"
import { FileTextIcon, UploadIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// First file-upload UI in the app (see the codebase exploration this
// feature is based on — nothing else has a file input), so this is
// deliberately minimal: a bordered drop target plus a hidden native file
// input for click-to-browse, no cropping/preview/multi-file machinery.

const ACCEPT = ".pdf,application/pdf"
const ACCEPTED_EXTENSIONS = [".pdf"]
const MAX_FILE_BYTES = 10 * 1024 * 1024 // mirrors MAX_FILE_BYTES in the preview route

interface ImportDropzoneProps {
  file: File | null
  onFileSelected: (file: File | null) => void
}

function validate(file: File): string | null {
  const name = file.name.toLowerCase()
  if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return "That doesn't look like a PDF — pick a different file"
  }
  if (file.size > MAX_FILE_BYTES) {
    return `File is too big — statements must be under ${MAX_FILE_BYTES / (1024 * 1024)} MB`
  }
  return null
}

export function ImportDropzone({ file, onFileSelected }: ImportDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  function pick(candidate: File | null) {
    if (!candidate) {
      setLocalError(null)
      onFileSelected(null)
      return
    }
    const reason = validate(candidate)
    if (reason) {
      setLocalError(reason)
      onFileSelected(null)
      return
    }
    setLocalError(null)
    onFileSelected(candidate)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    pick(e.dataTransfer.files?.[0] ?? null)
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    pick(e.target.files?.[0] ?? null)
  }

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <FileTextIcon className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB · PDF</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => pick(null)} aria-label="Remove file">
          <XIcon className="size-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-foreground/30 hover:bg-muted/30"
        )}
      >
        <div
          className={cn(
            "flex size-11 items-center justify-center rounded-full transition-colors",
            dragging ? "bg-primary/10" : "bg-muted"
          )}
        >
          <UploadIcon className={cn("size-5", dragging ? "text-primary" : "text-muted-foreground")} />
        </div>
        <p className="text-sm font-medium">Drop a MariBank e-Statement, or click to browse</p>
        <p className="text-xs text-muted-foreground">MariBank credit card or savings e-Statement PDF, up to 10 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={handleInputChange}
        />
      </div>
      {localError && <p className="text-sm text-destructive">{localError}</p>}
    </div>
  )
}
