import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatCell } from "@/lib/artifacts/data"

export function statusTone(value: string) {
  const normalized = value.toLowerCase()

  if (
    [
      "pass",
      "passed",
      "ok",
      "healthy",
      "linked",
      "running",
      "configured",
      "done",
      "yes",
      "success",
      "guarded",
      "checked",
      "loaded",
      "shared",
      "attached",
      "rendered",
      "manifested",
      "enforced",
    ].some((word) => normalized.includes(word))
  ) {
    return "success"
  }

  if (
    ["warn", "warning", "risk", "attention", "partial", "degraded", "drift", "medium"].some(
      (word) => normalized.includes(word)
    )
  ) {
    return "warning"
  }

  if (
    ["fail", "failed", "error", "blocked", "danger", "critical", "high", "leak", "down"].some(
      (word) => normalized.includes(word)
    )
  ) {
    return "danger"
  }

  if (
    ["info", "pending", "next", "review", "neutral", "optional", "preview", "check"].some(
      (word) => normalized.includes(word)
    )
  ) {
    return "accent"
  }

  return "neutral"
}

export function statusBadgeVariant(tone: ReturnType<typeof statusTone>) {
  if (tone === "danger") return "destructive"
  if (tone === "neutral") return "outline"
  if (tone === "success") return "default"

  return "secondary"
}

export function toneSurfaceClass(
  tone: "accent" | "success" | "warning" | "danger" | "neutral" | "default" | undefined
) {
  return cn(
    tone === "accent" && "bg-clay/8 border-clay/35",
    tone === "warning" && "bg-clay/12 border-clay/45",
    tone === "success" && "bg-olive/8 border-olive/35",
    tone === "danger" && "bg-rust/8 border-rust/35"
  )
}

export function statusPanelClass(value: unknown) {
  const tone = statusTone(formatCell(value))

  return toneSurfaceClass(tone)
}

export function statusIsVisible(value: unknown, description?: unknown) {
  if (value === undefined) return false

  const statusStr = formatCell(value)
  const descStr = description !== undefined ? formatCell(description) : ""

  return (
    statusStr.length > 0 &&
    statusStr.length <= 16 &&
    statusStr.toLowerCase() !== descStr.toLowerCase()
  )
}

export function StatusChip({ value, className }: { value: unknown; className?: string }) {
  const text = formatCell(value)
  const tone = statusTone(text)

  return (
    <Badge variant={statusBadgeVariant(tone)} className={cn("justify-start", className)}>
      {text}
    </Badge>
  )
}

type SignalTone = "accent" | "success" | "warning" | "danger" | "neutral" | "default" | undefined

/** Editorial: tone -> signal. Used by editorial adapters only. */
export function toneSignal(tone: SignalTone): "new" | "risk" | "wait" | "done" {
  if (tone === "success") return "new"
  if (tone === "warning" || tone === "danger") return "risk"
  if (tone === "accent") return "wait"

  return "done"
}

const SIGNAL_TEXT = {
  new: "text-signal-new",
  risk: "text-signal-risk",
  wait: "text-signal-wait",
  done: "text-ink-muted",
} as const

/** Editorial dot + mono label. Legacy nodes use StatusChip (badge). */
export function SignalChip({ value, className }: { value: unknown; className?: string }) {
  const text = formatCell(value)
  const signal = toneSignal(statusTone(text))

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-label uppercase tracking-[0.14em]",
        SIGNAL_TEXT[signal],
        className
      )}
    >
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
      {text}
    </span>
  )
}
