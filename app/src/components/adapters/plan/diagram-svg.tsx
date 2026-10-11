"use client"

// SVG building blocks for hand-drawn diagrams (sequence, state-machine).
// `map` and `story` no longer live here: Mermaid draws them (components/mermaid/map-mermaid.tsx).
import { useEffect, useState } from "react"


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
