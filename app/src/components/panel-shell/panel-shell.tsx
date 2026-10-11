"use client"

import { cn } from "@/lib/utils"

interface PanelShellProps {
  /**
   * Whether the panel is currently revealed. When false the panel is moved
   * off-screen, hidden from assistive tech, and made pointer-inert so the
   * artifact canvas stays fully tappable.
   */
  open: boolean
  /** Accessibility label for the revealed panel. */
  ariaLabel: string
  children: React.ReactNode
}

export function PanelShell({ open, ariaLabel, children }: PanelShellProps) {
  return (
    <aside
      className={cn(
        "va-panel fixed z-30 flex flex-col bg-card",
        open
          ? "va-panel-open visible opacity-100"
          : "invisible opacity-0 pointer-events-none",
      )}
      data-state={open ? "open" : "closed"}
      aria-hidden={!open}
      inert={!open}
      role={open ? "complementary" : undefined}
      aria-label={open ? ariaLabel : undefined}
    >
      {children}
    </aside>
  )
}