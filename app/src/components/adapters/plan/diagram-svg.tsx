"use client"

// SVG building blocks for hand-drawn diagrams (sequence, state-machine).
// `map` and `story` no longer live here: Mermaid draws them (components/mermaid/map-mermaid.tsx).
import { useEffect, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

/** SVG text sizes come from the type tokens, so they match the page and stay in one place. */
export const SVG_TEXT = {
  label: "var(--fs-small)",
  meta: "var(--fs-meta)",
  tiny: "var(--fs-label)",
} as const

// ---------------------------------------------------------------------------
// Measuring
// ---------------------------------------------------------------------------

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])
  return reduced
}

// ---------------------------------------------------------------------------
// Older helpers (state-machine)
// ---------------------------------------------------------------------------

export function ArrowDefs({ id }: { id: string }) {
  const marker = (suffix: string, color: string) => (
    <marker id={`${id}-${suffix}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
      <path d="M1,1.5 L9,5 L1,8.5" fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </marker>
  )
  return (
    <defs>
      {marker("muted", "var(--ink-muted)")}
      {marker("added", "var(--signal-new)")}
      {marker("changed", "var(--signal-wait)")}
      {marker("removed", "var(--signal-risk)")}
    </defs>
  )
}

export function markerFor(id: string, mark: string | undefined) {
  if (mark === "added" || mark === "proposed") return `url(#${id}-added)`
  if (mark === "changed") return `url(#${id}-changed)`
  if (mark === "removed") return `url(#${id}-removed)`
  return `url(#${id}-muted)`
}

/** Bare canvas that scrolls horizontally on narrow screens. */
export function DiagramCanvas({ width, height, label, children }: { width: number; height: number; label: string; children: ReactNode }) {
  return (
    <div className="va-scroll-fade" tabIndex={0} role="region" aria-label={`${label} (scrolls horizontally)`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto block max-w-none"
        role="img"
        aria-label={label}
        style={{ fontFamily: "var(--font-sans)" }}
      >
        {children}
      </svg>
    </div>
  )
}

export function EdgeLabel({ x, y, text, className }: { x: number; y: number; text: string; className?: string }) {
  return (
    <g className={cn("pointer-events-none", className)}>
      <text x={x} y={y + 4} textAnchor="middle" style={{ fontSize: SVG_TEXT.meta }} fill="var(--ink)" fillOpacity={0.8} stroke="var(--background)" strokeWidth={4} paintOrder="stroke" strokeLinejoin="round">
        {text}
      </text>
    </g>
  )
}
