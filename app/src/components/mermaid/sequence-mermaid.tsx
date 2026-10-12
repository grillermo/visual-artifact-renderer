"use client"

// Renders sequence steps through Mermaid sequenceDiagram. Per-message styling (proposed, key,
// lost) is applied after render because linkStyle-style CSS variables don't exist for sequences.
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react"

import { compileSequence, type CompiledSequence, type SeqInput } from "@/lib/diagram/sequence-to-mermaid"

import { renderMermaidSvg, useDocumentTheme } from "./mermaid-diagram"
import { mermaidThemeVariables } from "./mermaid-theme"
import { MermaidScrollFrame } from "./scroll-frame"

const SEQ_CONFIG = { useMaxWidth: false, actorMargin: 48, width: 140, height: 40, messageMargin: 34, boxMargin: 8, noteMargin: 10, mirrorActors: false, wrap: true, messageAlign: "center" } as const

export function useSequenceSvg(input: SeqInput): { svg: string; compiled: CompiledSequence; error: string | null } {
  const rawId = useId()
  const baseId = useMemo(() => `sq-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`, [rawId])
  const theme = useDocumentTheme()
  const compiled = useMemo(() => compileSequence(input), [input])
  const [state, setState] = useState<{ svg: string; error: string | null }>({ svg: "", error: null })
  useEffect(() => {
    let cancelled = false
    const fontsReady = document.fonts?.ready ?? Promise.resolve()
    fontsReady
      .then(() => renderMermaidSvg(`${baseId}-${theme}`, compiled.code, { sequence: SEQ_CONFIG, themeVariables: { ...mermaidThemeVariables(), fontSize: "14px" } }))
      .then((svg) => !cancelled && setState({ svg, error: null }))
      .catch((e) => !cancelled && setState({ svg: "", error: e instanceof Error ? e.message : "Could not render sequence" }))
    return () => {
      cancelled = true
    }
  }, [compiled, baseId, theme])
  return { ...state, compiled }
}

export function decorateSequenceSvg(root: HTMLElement, input: SeqInput, compiled: CompiledSequence, keyed: ReadonlySet<number>) {
  const lines = Array.from(root.querySelectorAll<SVGElement>("line.messageLine0, line.messageLine1, path.messageLine0, path.messageLine1"))
  const texts = Array.from(root.querySelectorAll<SVGElement>("text.messageText"))
  compiled.messageSteps.forEach((stepIndex, m) => {
    const step = input.steps[stepIndex]
    if (step.kind !== "message") return
    const proposed = step.mark === "proposed" || step.mark === "added"
    const key = keyed.has(m)
    const line = lines[m]
    const text = texts[m]
    if (line) {
      line.dataset.step = String(stepIndex)
      line.style.stroke = key || proposed ? "var(--signal-new)" : "var(--ink)"
      line.style.strokeOpacity = key || proposed ? "1" : "0.6"
      line.style.strokeWidth = key ? "1.8px" : "1.3px"
      line.style.strokeDasharray = proposed ? "7 5" : step.style === "reply" ? "3 4" : ""
      if (key) line.dataset.key = "true"
    }
    if (text && key) text.style.fontWeight = "700"
  })
  trimLifelines(root)
  cropToWholeSvg(root.querySelector("svg"))
}

/** Mermaid leaves lifelines at a 2000px placeholder when actors aren't mirrored; end them at the last drawn item. */
function trimLifelines(root: HTMLElement) {
  let bottom = 0
  root.querySelectorAll<SVGGraphicsElement>("line[class^='messageLine'], path[class^='messageLine'], text.messageText, rect.note, text.noteText, g > text.sequenceNumber").forEach((el) => {
    const box = el.getBBox()
    bottom = Math.max(bottom, box.y + box.height)
  })
  if (!bottom) return
  root.querySelectorAll<SVGLineElement>("line.actor-line").forEach((l) => l.setAttribute("y2", String(Math.ceil(bottom + 18))))
}

export function SequenceCanvas({ svg, label, error, input, compiled, keyed }: { svg: string; label: string; error: string | null; input: SeqInput; compiled: CompiledSequence; keyed: ReadonlySet<number> }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (svg && ref.current) decorateSequenceSvg(ref.current, input, compiled, keyed)
  }, [svg, input, compiled, keyed])
  if (error) {
    return (
      <pre className="whitespace-pre-wrap border-l-2 border-signal-risk pl-3 text-meta text-ink-muted" role="alert">
        {error}
      </pre>
    )
  }
  if (!svg) return <div className="min-h-40 font-mono text-label uppercase tracking-[0.14em] text-ink-muted">Rendering Mermaid…</div>
  return <MermaidScrollFrame frameRef={ref} html={svg} data-map-canvas="" role="img" aria-label={label} className="mm-seq" />
}

/** Sequence SVGs have many top-level groups, so crop to the box around all of them. */
function cropToWholeSvg(svg: SVGSVGElement | null) {
  if (!svg) return
  const box = svg.getBBox()
  const pad = 8
  const [x, y, w, h] = [box.x - pad, box.y - pad, box.width + pad * 2, box.height + pad * 2]
  svg.setAttribute("viewBox", `${x} ${y} ${w} ${h}`)
  svg.setAttribute("width", String(Math.ceil(w)))
  svg.setAttribute("height", String(Math.ceil(h)))
  svg.style.maxWidth = "none"
}
