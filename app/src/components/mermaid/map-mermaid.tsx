"use client"

// Renders `map` JSON through Mermaid. The compiler (lib/diagram/map-to-mermaid) writes the
// flowchart text; Mermaid does layout and arrow routing; globals.css (.mm-*) styles it.
// Mobile rule: the SVG keeps its natural size and the frame scrolls sideways, so text
// never shrinks below its design size.
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { compileMap, edgeStroke, type CompiledMap, type MapInput, type MapSignal } from "@/lib/diagram/map-to-mermaid"

import { mermaidThemeVariables } from "./mermaid-theme"
import { MermaidScrollFrame } from "./scroll-frame"
import { renderMermaidSvg, useDocumentTheme } from "./mermaid-diagram"

const SIGNAL_WORD: Record<MapSignal, string> = { new: "new", risk: "can break", wait: "waiting" }
const SIGNAL_VAR: Record<MapSignal, string> = { new: "var(--signal-new)", risk: "var(--signal-risk)", wait: "var(--signal-wait)" }

const FLOWCHART_CONFIG = {
  htmlLabels: true,
  curve: "linear",
  useMaxWidth: false,
  nodeSpacing: 40,
  rankSpacing: 36,
  padding: 4,
  wrappingWidth: 130,
  defaultRenderer: "dagre-wrapper",
} as const

export type MapRender = { svg: string; compiled: CompiledMap }

/** Compile and render a map. Re-runs when the input or the document theme changes. */
export function useMapSvg(input: MapInput): { svg: string; compiled: CompiledMap; error: string | null } {
  const rawId = useId()
  const baseId = useMemo(() => `map-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`, [rawId])
  const revision = useRef(0)
  const theme = useDocumentTheme()
  const compiled = useMemo(() => compileMap(input), [input])
  const [state, setState] = useState<{ svg: string; error: string | null }>({ svg: "", error: null })

  useEffect(() => {
    let cancelled = false
    // Mermaid removes existing DOM with its render ID. Resize can produce the
    // same SVG, so reusing an ID clears the mounted drawing without React restoring it.
    const renderId = `${baseId}-${theme}-${revision.current++}`
    // Mermaid measures labels while rendering, so the web fonts must be ready first.
    const fontsReady = document.fonts?.ready ?? Promise.resolve()
    fontsReady
      .then(() => renderMermaidSvg(renderId, compiled.code, { flowchart: FLOWCHART_CONFIG, themeVariables: { ...mermaidThemeVariables(), fontSize: "14px" } }))
      .then((svg) => !cancelled && setState({ svg, error: null }))
      .catch((e) => !cancelled && setState({ svg: "", error: e instanceof Error ? e.message : "Could not render map" }))
    return () => {
      cancelled = true
    }
  }, [compiled, baseId, theme])

  return { ...state, compiled }
}

/**
 * Style the rendered SVG per edge. Mermaid's linkStyle cannot take CSS variables, so colours
 * and dashes are set here. Edges and edge labels render in declaration order.
 * Tags each with data-mm-edge="<index>" so `story` can find them.
 */
export function decorateMapSvg(root: HTMLElement, compiled: CompiledMap) {
  const paths = Array.from(root.querySelectorAll<SVGPathElement>(".edgePaths path.flowchart-link"))
  const labels = Array.from(root.querySelectorAll<SVGGElement>(".edgeLabels > .edgeLabel, .edgeLabels > g > .edgeLabel"))
  compiled.edges.forEach((edge, i) => {
    const { colour, dashed, proposed } = edgeStroke(edge.spec)
    const path = paths[i]
    if (path) {
      path.dataset.mmEdge = String(i)
      path.style.stroke = colour
      path.style.strokeWidth = edge.spec.style === "bold" ? "2.2px" : "1.3px"
      path.style.strokeDasharray = dashed ? (proposed ? "7 5" : "3 5") : ""
      path.style.strokeOpacity = proposed ? "1" : "0.7"
      // Cycle-closing edges are laid out forward; hide the arrowhead at the far end.
      if (edge.reversed) path.removeAttribute("marker-end")
    }
    const label = labels[i]
    if (label) label.dataset.mmEdge = String(i)
  })
  cropToContent(root.querySelector("svg"))
  root.querySelectorAll<SVGGElement>(".node").forEach((el) => {
    const m = /flowchart-(n\d+)-/.exec(el.id)
    if (m) el.dataset.mmNode = m[1]
  })
}

/** Trim empty margin: viewBox = content bounds plus a small pad. Width/height become natural px. */
export function cropToContent(svg: SVGSVGElement | null) {
  if (!svg) return
  const group = svg.querySelector<SVGGElement>(":scope > g")
  if (!group) return
  const box = group.getBBox()
  let left = box.x
  let top = box.y
  let right = box.x + box.width
  let bottom = box.y + box.height
  // getBBox excludes HTML overflowing foreignObject. Include the visible labels
  // in SVG coordinates before cropping, otherwise their last lines disappear.
  const matrix = svg.getScreenCTM?.()?.inverse()
  if (matrix && svg.createSVGPoint) {
    const point = svg.createSVGPoint()
    for (const label of svg.querySelectorAll(".mm-n, .edgeLabel foreignObject")) {
      const rect = label.getBoundingClientRect()
      point.x = rect.left
      point.y = rect.top
      const start = point.matrixTransform(matrix)
      point.x = rect.right
      point.y = rect.bottom
      const end = point.matrixTransform(matrix)
      left = Math.min(left, start.x)
      top = Math.min(top, start.y)
      right = Math.max(right, end.x)
      bottom = Math.max(bottom, end.y)
    }
  }
  const pad = 12
  const [x, y, w, h] = [left - pad, top - pad, right - left + pad * 2, bottom - top + pad * 2]
  svg.setAttribute("viewBox", `${x} ${y} ${w} ${h}`)
  svg.setAttribute("width", String(Math.ceil(w)))
  svg.setAttribute("height", String(Math.ceil(h)))
  svg.style.maxWidth = "none"
  svg.dataset.naturalWidth = String(Math.ceil(w))
}

/** Never shrink text below this share of its natural size; below it the frame scrolls instead. */
const MIN_FIT_SCALE = 0.93 // 14px text stays at or above 13px

/** The scrolling frame around a rendered map SVG. Children can decorate via `svgRef`. */
export function MapCanvas({
  svg,
  label,
  error,
  className,
  svgRef,
  compiled,
  minHeight = 160,
  maxScale = 1,
}: {
  svg: string
  label: string
  error: string | null
  className?: string
  svgRef?: React.RefObject<HTMLDivElement | null>
  compiled?: CompiledMap
  minHeight?: number
  /** Largest enlargement when the frame is wider than the drawing. 1 = never above natural size. */
  maxScale?: number
}) {
  const innerRef = useRef<HTMLDivElement>(null)
  const ref = svgRef ?? innerRef
  useLayoutEffect(() => {
    if (svg && compiled && ref.current) decorateMapSvg(ref.current, compiled)
  }, [svg, compiled, ref])
  // Fit: shrink a little to fit the column on wide screens. Phones keep natural size and scroll.
  useLayoutEffect(() => {
    const el = ref.current
    const svg = el?.querySelector("svg")
    if (!el || !svg || !svg.dataset.naturalWidth) return
    const natural = Number(svg.dataset.naturalWidth)
    const naturalH = Number(svg.getAttribute("viewBox")?.split(" ")[3] ?? 0)
    const fit = () => {
      const scale = Math.min(maxScale, el.clientWidth / natural)
      const use = scale >= MIN_FIT_SCALE || scale > 1 ? scale : 1
      svg.setAttribute("width", String(Math.ceil(natural * use)))
      svg.setAttribute("height", String(Math.ceil(naturalH * use)))
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(el)
    return () => observer.disconnect()
  }, [svg, ref, maxScale])
  if (error) {
    return (
      <pre className="whitespace-pre-wrap border-l-2 border-signal-risk pl-3 text-meta text-ink-muted" role="alert">
        {error}
      </pre>
    )
  }
  if (!svg) {
    return (
      <div className="font-mono text-label uppercase tracking-[0.14em] text-ink-muted" style={{ minHeight }}>
        Rendering Mermaid…
      </div>
    )
  }
  return (
    <MermaidScrollFrame
      frameRef={ref}
      html={svg}
      data-map-canvas=""
      role="img"
      aria-label={label}
      className={className}
    />
  )
}

export function MapLegend({ compiled, nodes, legend }: { compiled: CompiledMap; nodes: MapInput["nodes"]; legend?: { solid?: string; dashed?: string } }) {
  const signals = (["new", "risk", "wait"] as const).filter((s) => nodes.some((n) => n.signal === s))
  const specs = compiled.edges.map((e) => e.spec)
  const proposed = specs.some((e) => e.mark === "proposed" || e.mark === "added")
  const dashed = specs.some((e) => e.style === "dashed" || e.mark === "removed")
  const items: ReactNode[] = []
  if (legend?.solid) items.push(<LineKey key="solid" label={legend.solid} />)
  if (legend?.dashed || dashed) items.push(<LineKey key="dashed" dash="3 5" label={legend?.dashed ?? "optional"} />)
  if (proposed) items.push(<LineKey key="proposed" dash="7 5" color="var(--signal-new)" label="proposed" />)
  for (const s of signals) {
    items.push(
      <li key={s} className="flex items-center gap-2">
        <span aria-hidden className="inline-block size-2 rounded-full" style={{ background: SIGNAL_VAR[s] }} />
        {SIGNAL_WORD[s]}
      </li>,
    )
  }
  if (!items.length) return null
  return (
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-meta text-ink-muted" aria-label="Legend">
      {items}
    </ul>
  )
}

export function MapConnectionList({ input }: { input: MapInput }) {
  const labels = new Map(input.nodes.map((node) => [node.id, node.label]))
  return (
    <ol className="va-map-list m-0 divide-y divide-rule border-y border-rule" aria-label="Map connections">
      {input.nodes.map((node) => (
        <li key={node.id} className="py-4">
          <p className="text-row-title font-semibold" style={{ color: node.signal ? SIGNAL_VAR[node.signal] : "var(--ink)" }}>
            {node.href ? <a href={node.href} className="underline underline-offset-4">{node.label}</a> : node.label}
            {node.signal && <span className="ml-2 text-meta font-normal">{SIGNAL_WORD[node.signal]}</span>}
          </p>
          {node.sub && <p className="mt-1 text-small text-ink-muted">{node.sub}</p>}
          <ul className="mt-2 space-y-1 text-small text-ink">
            {input.edges.filter((edge) => edge.from === node.id).map((edge, index) => (
              <li key={index}>
                <span aria-hidden="true">{edge.both ? "↔" : "→"} </span>
                {labels.get(edge.to) ?? edge.to}{edge.label ? `: ${edge.label}` : ""}
                {edge.mark && edge.mark !== "context" ? ` (${edge.mark})` : edge.style === "dashed" ? " (optional)" : ""}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}

function LineKey({ label, dash, color = "var(--ink)" }: { label: string; dash?: string; color?: string }) {
  return (
    <li className="flex items-center gap-2">
      <svg width="26" height="8" aria-hidden="true">
        <line x1="0" y1="4" x2="26" y2="4" stroke={color} strokeOpacity={color === "var(--ink)" ? 0.6 : 1} strokeWidth="1.3" strokeDasharray={dash} />
      </svg>
      {label}
    </li>
  )
}

/** Visually hidden edge list, so a screen reader gets the data flow the picture shows. */
export function EdgeSummary({ input }: { input: MapInput }) {
  const labels = new Map(input.nodes.map((n) => [n.id, n.label]))
  return (
    <ul className="sr-only">
      {input.edges.map((e, i) => (
        <li key={i}>
          {labels.get(e.from) ?? e.from} to {labels.get(e.to) ?? e.to}
          {e.label ? `: ${e.label}` : ""}
        </li>
      ))}
    </ul>
  )
}

export function MapMermaid({
  input,
  label,
  title,
  caption,
  legend,
}: {
  input: MapInput
  label: string
  title?: string
  caption?: string
  legend?: { solid?: string; dashed?: string }
}) {
  const figureRef = useRef<HTMLElement>(null)
  const [fitWidth, setFitWidth] = useState(input.fitWidth)
  useLayoutEffect(() => {
    const figure = figureRef.current
    if (!figure) return
    const fit = () => setFitWidth(Math.max(1, Math.floor(figure.clientWidth)))
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(figure)
    return () => observer.disconnect()
  }, [])
  const fittedInput = useMemo(() => ({ ...input, fitWidth }), [input, fitWidth])
  const { svg, compiled, error } = useMapSvg(fittedInput)
  const ref = useRef<HTMLDivElement>(null)
  return (
    <figure ref={figureRef} className="va-map m-0 flex min-w-0 flex-col" data-map="">
      {title && <div className="mb-3 font-mono text-label uppercase tracking-[0.14em] text-ink-muted">{title}</div>}
      <div className="va-map-drawing">
        <MapCanvas svg={svg} label={label} error={error} svgRef={ref} compiled={compiled} />
        <EdgeSummary input={input} />
      </div>
      <MapConnectionList input={input} />
      <MapLegend compiled={compiled} nodes={input.nodes} legend={legend} />
      {caption && <figcaption className="mt-3 max-w-[66ch] text-meta text-ink-muted">{caption}</figcaption>}
    </figure>
  )
}
