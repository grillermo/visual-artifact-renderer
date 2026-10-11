"use client"

// Renders `state-machine` JSON through Mermaid stateDiagram-v2. The compiler writes the text,
// Mermaid does layout; this file styles per transition/state after render (linkStyle and
// classDef cannot take CSS variables) and wires clicks to state selection.
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react"

import { compileMachine, isProposed, type CompiledMachine, type MachineInput } from "@/lib/diagram/state-machine-to-mermaid"

import { renderMermaidSvg, useDocumentTheme } from "./mermaid-diagram"
import { mermaidThemeVariables } from "./mermaid-theme"
import { MermaidScrollFrame } from "./scroll-frame"
import { cropToContent } from "./map-mermaid"

const STATE_CONFIG = { useMaxWidth: false, padding: 10, nodeSpacing: 60, rankSpacing: 70, defaultRenderer: "dagre-wrapper" } as const

export function useMachineSvg(input: MachineInput): { svg: string; compiled: CompiledMachine; error: string | null } {
  const rawId = useId()
  const baseId = useMemo(() => `sm-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`, [rawId])
  const theme = useDocumentTheme()
  const compiled = useMemo(() => compileMachine(input), [input])
  const [state, setState] = useState<{ svg: string; error: string | null }>({ svg: "", error: null })
  useEffect(() => {
    let cancelled = false
    const fontsReady = document.fonts?.ready ?? Promise.resolve()
    fontsReady
      .then(() => renderMermaidSvg(`${baseId}-${theme}`, compiled.code, { state: STATE_CONFIG, themeVariables: { ...mermaidThemeVariables(), fontSize: "14px" } }))
      .then((svg) => !cancelled && setState({ svg, error: null }))
      .catch((e) => !cancelled && setState({ svg: "", error: e instanceof Error ? e.message : "Could not render state machine" }))
    return () => {
      cancelled = true
    }
  }, [compiled, baseId, theme])
  return { ...state, compiled }
}

/** Tag states and transitions, apply per-event styling, mark the selected state. */
export function decorateMachineSvg(root: HTMLElement, input: MachineInput, compiled: CompiledMachine, selected: string) {
  const paths = Array.from(root.querySelectorAll<SVGPathElement>(".edgePaths path"))
  const labels = Array.from(root.querySelectorAll<SVGGElement>(".edgeLabels > .edgeLabel, .edgeLabels > g > .edgeLabel"))
  compiled.transitions.forEach((eventIndex, i) => {
    const path = paths[i]
    const label = labels[i]
    if (path) path.dataset.smTransition = String(i)
    if (eventIndex === null) return
    const e = input.events[eventIndex]
    const from = e.from
    const proposed = isProposed(e.mark)
    if (path) {
      path.dataset.smEvent = e.event
      path.style.stroke = proposed ? "var(--signal-new)" : "var(--ink)"
      path.style.strokeOpacity = from === selected || proposed ? "1" : "0.55"
      path.style.strokeWidth = from === selected ? "2px" : "1.3px"
      path.style.strokeDasharray = proposed ? "7 5" : ""
    }
    if (label) label.dataset.smEvent = e.event
  })
  const byMermaidId = new Map([...compiled.stateIds].map(([id, m]) => [m, id]))
  root.querySelectorAll<SVGGElement>("g.node").forEach((el) => {
    const m = /state-(s\d+)-/.exec(el.id)
    const id = m ? byMermaidId.get(m[1]) : undefined
    if (!id) return
    el.dataset.state = id
    el.classList.toggle("sm-selected", id === selected)
    const spec = input.states.find((s) => s.id === id)
    el.classList.toggle("sm-proposed", isProposed(spec?.mark))
    el.classList.toggle("sm-final", !!spec?.final)
  })
  cropToContent(root.querySelector("svg"))
}

export function MachineCanvas({
  svg,
  label,
  error,
  input,
  compiled,
  selected,
  onSelect,
}: {
  svg: string
  label: string
  error: string | null
  input: MachineInput
  compiled: CompiledMachine
  selected: string
  onSelect: (id: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (svg && ref.current) decorateMachineSvg(ref.current, input, compiled, selected)
  }, [svg, input, compiled, selected])
  if (error) {
    return (
      <pre className="whitespace-pre-wrap border-l-2 border-signal-risk pl-3 text-meta text-ink-muted" role="alert">
        {error}
      </pre>
    )
  }
  if (!svg) return <div className="min-h-40 font-mono text-label uppercase tracking-[0.14em] text-ink-muted">Rendering Mermaid…</div>
  return (
    <MermaidScrollFrame
      frameRef={ref}
      html={svg}
      data-map-canvas=""
      role="img"
      aria-label={label}
      className="mm-state"
      onClick={(event) => {
        const id = (event.target as Element).closest<SVGGElement>("g.node")?.dataset.state
        if (id) onSelect(id)
      }}
    />
  )
}
