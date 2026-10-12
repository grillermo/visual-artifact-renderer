import { AlertTriangle, CheckCircle2, Clock, Info, Minus, Sparkles } from "lucide-react"
import type { ComponentType } from "react"

export type RowSignal = "risk" | "wait" | "new" | "done" | "none"

export const SIGNAL_TEXT: Record<RowSignal, string> = {
  risk: "text-signal-risk",
  wait: "text-signal-wait",
  new: "text-signal-new",
  done: "text-ink-muted",
  none: "text-ink-muted",
}

export const SIGNAL_RULE: Record<RowSignal, string> = {
  risk: "border-signal-risk",
  wait: "border-signal-wait",
  new: "border-signal-new",
  done: "border-rule",
  none: "border-rule",
}

export const SIGNAL_ICON: Record<RowSignal, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  risk: AlertTriangle,
  wait: Clock,
  new: Sparkles,
  done: CheckCircle2,
  none: Minus,
}

export const TONE_ICON = { note: Info, risk: AlertTriangle, new: Sparkles, wait: Clock } as const

/** Mono caps label used for kickers, group heads, column heads. */
export const LABEL_CLASS = "font-mono text-label uppercase tracking-[0.14em]"
