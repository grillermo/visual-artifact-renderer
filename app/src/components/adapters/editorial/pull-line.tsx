import type { ReactNode } from "react"

import { SIGNAL_RULE, type RowSignal } from "./rows/signal"

/**
 * Serif italic line with a left rule. Default is light (body-sized, thin rule);
 * `strong` is the full pull quote used by lead chapters.
 */
export function PullLine({
  children,
  signal,
  strong = false,
}: {
  children: ReactNode
  signal?: RowSignal
  strong?: boolean
}) {
  // Joined by hand: tailwind-merge treats text-<size> and text-<colour> as one group.
  const className = [
    "max-w-[44ch] font-serif italic [text-wrap:balance]",
    strong ? "border-l-[3px] pl-5 text-pull text-ink" : "border-l pl-4 text-body text-ink-muted",
    signal ? SIGNAL_RULE[signal] : strong ? "border-ink" : "border-rule-strong",
  ].join(" ")
  return (
    <p data-pull-line data-strong={strong || undefined} className={className}>
      {children}
    </p>
  )
}
