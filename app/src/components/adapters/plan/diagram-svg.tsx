"use client"

// SVG building blocks for diagrams.
//  - MapFigure / MapSvg: the editorial renderer behind `map`, `story` and legacy `box-diagram`.
//    Nodes are text with a glyph and a hairline underline. Edge labels come from
//    lib/diagram/label-placement, so a label never sits under a node.
//  - ArrowDefs / DiagramCanvas / EdgeLabel: older helpers still used by `state-machine`.
import { useEffect, useId, useMemo, useState, type ReactNode } from "react"

import {
  layoutNarrow,
  pickOrientation,
  type LaidEdge,
  type LaidNode,
  type MapLayout,
  type MapLayoutInput,
  type MapSignal,
} from "@/lib/diagram/map-layout"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Shared tokens
// ---------------------------------------------------------------------------

const SIGNAL_COLOR: Record<MapSignal, string> = {
  new: "var(--signal-new)",
  risk: "var(--signal-risk)",
  wait: "var(--signal-wait)",
}
/** SVG text sizes come from the type tokens, so they match the page and stay in one place. */
export const SVG_TEXT = {
  label: "var(--fs-small)",
  meta: "var(--fs-meta)",
  tiny: "var(--fs-label)",
} as const
/** Dimmed (not yet active) content stays readable. */
export const DIM_OPACITY = 0.65

const SIGNAL_WORD: Record<MapSignal, string> = { new: "new", risk: "can break", wait: "waiting" }

function nodeColor(signal: MapSignal | undefined) {
  return signal ? SIGNAL_COLOR[signal] : "var(--ink)"
}

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
// Map rendering
// ---------------------------------------------------------------------------

function Glyph({ kind, color }: { kind: LaidNode["kind"]; color: string }) {
  const common = { fill: "none", stroke: color, strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round" } as const
  switch (kind) {
    case "actor":
      return (
        <g {...common}>
          <circle cx={7} cy={4.5} r={3} />
          <path d="M1.5 13 C1.5 9.8 3.9 8 7 8 S12.5 9.8 12.5 13" />
        </g>
      )
    case "store":
      return (
        <g {...common}>
          <ellipse cx={7} cy={3.2} rx={5.5} ry={2.2} />
          <path d="M1.5 3.2 V10.6 C1.5 11.9 4 12.9 7 12.9 S12.5 11.9 12.5 10.6 V3.2" />
        </g>
      )
    case "file":
      return (
        <g {...common}>
          <path d="M2.5 1.5 H8.5 L11.5 4.5 V12.5 H2.5 Z" />
          <path d="M8.5 1.5 V4.5 H11.5" />
        </g>
      )
    case "external":
      return <circle cx={7} cy={7} r={5.5} {...common} strokeDasharray="2.4 2.2" />
    default:
      return <rect x={1.5} y={1.5} width={11} height={11} rx={3} {...common} />
  }
}

function MapNode({ node, dim, hidden, animate }: { node: LaidNode; dim: boolean; hidden: boolean; animate: boolean }) {
  const { rect } = node
  const color = nodeColor(node.signal)
  const underlineY = rect.h - 2
  const body = (
    <g
      data-map-node={node.id}
      transform={`translate(${rect.x} ${rect.y})`}
      style={{ opacity: hidden ? 0 : dim ? DIM_OPACITY : 1, transition: animate ? "opacity 300ms ease-out" : undefined }}
    >
      <title>{[node.label, node.sub].filter(Boolean).join(" — ")}</title>
      <g transform="translate(0 4)">
        <Glyph kind={node.kind} color={color} />
      </g>
      <text x={20} y={16} style={{ fontSize: SVG_TEXT.label }} fontWeight={600} fill={color}>
        {node.label}
      </text>
      {node.sub && (
        <text x={20} y={34} style={{ fontSize: SVG_TEXT.meta }} fill="var(--ink-muted)">
          {node.sub}
        </text>
      )}
      <line x1={0} y1={underlineY} x2={rect.w} y2={underlineY} stroke={node.signal ? color : "var(--ink)"} strokeOpacity={node.signal ? 0.5 : 0.3} strokeWidth={1} />
    </g>
  )
  return node.href ? (
    <a href={node.href} aria-label={`${node.label}: go to ${node.href.replace(/^#/, "")}`}>
      {body}
    </a>
  ) : (
    body
  )
}

function pathOf(points: LaidEdge["points"], selfLoop: boolean) {
  if (selfLoop) {
    const [p0, p1, p2, p3] = points
    return `M${p0.x},${p0.y} C${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`
  }
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
}

function MapEdge({ edge, markerId, hidden, animate }: { edge: LaidEdge; markerId: string; hidden: boolean; animate: boolean }) {
  const { spec, placement } = edge
  if (edge.points.length < 2) return null
  const proposed = spec.mark === "proposed" || spec.mark === "added"
  const removed = spec.mark === "removed"
  const changed = spec.mark === "changed"
  const stroke = proposed ? "var(--signal-new)" : removed ? "var(--signal-risk)" : changed ? "var(--signal-wait)" : "var(--ink)"
  const dash = proposed ? "7 5" : spec.style === "dashed" || removed ? "3 5" : undefined
  const marker = `url(#${markerId}-${proposed ? "new" : "ink"})`
  const ease = "cubic-bezier(0.16, 1, 0.3, 1)"
  const solid = !dash
  // Solid edges draw along their route; dashed ones only fade (a dash pattern cannot be drawn).
  // The arrowhead and label appear as the line arrives.
  const groupTransition = !animate ? undefined : solid ? "opacity 1ms linear" : `opacity 260ms ${ease}`
  return (
    <g data-map-edge={`${spec.from}-${spec.to}`} style={{ opacity: hidden ? 0 : 1, transition: groupTransition }}>
      <path
        d={pathOf(edge.points, edge.selfLoop)}
        fill="none"
        stroke={stroke}
        strokeOpacity={proposed ? 1 : 0.55}
        strokeWidth={spec.style === "bold" ? 2.2 : 1.3}
        strokeDasharray={dash ?? (animate ? 1 : undefined)}
        pathLength={solid && animate ? 1 : undefined}
        style={solid && animate ? { strokeDashoffset: hidden ? 1 : 0, transition: `stroke-dashoffset 260ms ${ease}` } : undefined}
        markerEnd={marker}
        markerStart={spec.both ? marker : undefined}
      />
      {placement?.kind === "inline" && (
        <text
          data-edge-label=""
          style={{ fontSize: SVG_TEXT.meta }}
          fill="var(--ink)"
          fillOpacity={0.8}
          textAnchor="middle"
          stroke="var(--background)"
          strokeWidth={4}
          paintOrder="stroke"
          strokeLinejoin="round"
        >
          {placement.lines.map((line, i) => (
            <tspan key={i} x={placement.rect.x + placement.rect.w / 2} y={placement.rect.y + 2 + placement.lineHeight * (i + 1) - 4}>
              {line}
            </tspan>
          ))}
        </text>
      )}
      {placement?.kind === "marker" && edge.marker && (
        <g>
          <circle cx={placement.at.x} cy={placement.at.y} r={placement.radius} fill="var(--background)" stroke="var(--ink)" strokeOpacity={0.6} />
          <text x={placement.at.x} y={placement.at.y + 4} style={{ fontSize: SVG_TEXT.tiny }} fontWeight={600} textAnchor="middle" fill="var(--ink)">
            {edge.marker}
          </text>
        </g>
      )}
    </g>
  )
}

export function MapSvg({
  layout,
  label,
  visible,
  focus,
  animate = false,
  maxScale = 1,
  crop,
  className,
}: {
  layout: MapLayout
  label: string
  /** Node ids to show. Omit to show everything. */
  visible?: ReadonlySet<string>
  /** Node ids to emphasise; the other visible nodes dim. */
  focus?: ReadonlySet<string>
  animate?: boolean
  /** How far past its natural size the drawing may grow to fill its container. */
  maxScale?: number
  /** Show only this part of the drawing (used on phones so text stays readable). */
  crop?: { x: number; y: number; w: number; h: number }
  className?: string
}) {
  const markerId = useId().replace(/:/g, "")
  const showNode = (id: string) => !visible || visible.has(id)
  const dimmed = (id: string) => !!focus && focus.size > 0 && !focus.has(id)
  return (
    <svg
      viewBox={crop ? `${crop.x} ${crop.y} ${crop.w} ${crop.h}` : `0 0 ${layout.width} ${layout.height}`}
      width={crop ? crop.w : layout.width}
      height={crop ? crop.h : layout.height}
      className={cn("block h-auto w-full", className)}
      style={{ maxWidth: (crop ? crop.w : layout.width) * maxScale, fontFamily: "var(--font-sans)" }}
      role="img"
      aria-label={label}
      data-map-orientation={layout.orientation}
    >
      <defs>
        {(["ink", "new"] as const).map((tone) => (
          <marker key={tone} id={`${markerId}-${tone}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
            <path d="M1,1.5 L9,5 L1,8.5" fill="none" stroke={tone === "new" ? "var(--signal-new)" : "var(--ink)"} strokeOpacity={tone === "new" ? 1 : 0.6} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        ))}
      </defs>
      {layout.groups.map((group, i) => (
        <g key={i}>
          <text x={group.x} y={group.y} fill="var(--ink-muted)" style={{ fontSize: SVG_TEXT.tiny, textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "var(--font-mono)" }}>
            {group.label}
          </text>
          <line x1={group.x} y1={group.y + 6} x2={group.x + group.w} y2={group.y + 6} stroke="var(--rule)" />
        </g>
      ))}
      {layout.edges.map((edge) => (
        <MapEdge key={edge.index} edge={edge} markerId={markerId} hidden={!(showNode(edge.spec.from) && showNode(edge.spec.to))} animate={animate} />
      ))}
      {layout.nodes.map((node) => (
        <MapNode key={node.id} node={node} hidden={!showNode(node.id)} dim={dimmed(node.id)} animate={animate} />
      ))}
    </svg>
  )
}

export function MapLegend({
  layout,
  legend,
}: {
  layout: MapLayout
  legend?: { solid?: string; dashed?: string }
}) {
  const signals = (["new", "risk", "wait"] as const).filter((s) => layout.nodes.some((n) => n.signal === s))
  const proposed = layout.edges.some((e) => e.spec.mark === "proposed" || e.spec.mark === "added")
  const dashed = layout.edges.some((e) => e.spec.style === "dashed" || e.spec.mark === "removed")
  const items: ReactNode[] = []
  if (legend?.solid) items.push(<LineKey key="solid" label={legend.solid} />)
  if (legend?.dashed || dashed) items.push(<LineKey key="dashed" dash="3 5" label={legend?.dashed ?? "optional"} />)
  if (proposed) items.push(<LineKey key="proposed" dash="7 5" color="var(--signal-new)" label="proposed" />)
  for (const s of signals) {
    items.push(
      <li key={s} className="flex items-center gap-2">
        <span aria-hidden className="inline-block size-2 rounded-full" style={{ background: SIGNAL_COLOR[s] }} />
        {SIGNAL_WORD[s]}
      </li>,
    )
  }
  if (!items.length && !layout.markers.length) return null
  return (
    <div className="mt-3 space-y-2 text-meta text-ink-muted">
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-x-5 gap-y-1" aria-label="Legend">
          {items}
        </ul>
      )}
      {layout.markers.length > 0 && (
        <ol className="space-y-0.5" aria-label="Edge labels">
          {layout.markers.map((m) => (
            <li key={m.n}>
              <span className="mr-2 font-semibold text-ink">{m.n}</span>
              {m.text}
            </li>
          ))}
        </ol>
      )}
    </div>
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
export function EdgeSummary({ layout }: { layout: MapLayout }) {
  const labels = new Map(layout.nodes.map((n) => [n.id, n.label]))
  return (
    <ul className="sr-only">
      {layout.edges.map((e) => (
        <li key={e.index}>
          {labels.get(e.spec.from) ?? e.spec.from} to {labels.get(e.spec.to) ?? e.spec.to}
          {e.spec.label ? `: ${e.spec.label}` : ""}
        </li>
      ))}
    </ul>
  )
}

/** Content width (px) the figure column offers on desktop and on a phone. Fixed, not measured. */
const NOMINAL_WIDE = 760

export function MapFigure({
  input,
  label,
  title,
  caption,
  legend,
  preferred = "row",
}: {
  input: MapLayoutInput
  label: string
  title?: string
  caption?: string
  legend?: { solid?: string; dashed?: string }
  preferred?: "row" | "column"
}) {
  // Orientation is chosen per breakpoint from the content, then CSS shows one of them.
  // No measuring, so nothing flips after the first paint.
  const wide = useMemo(() => pickOrientation(input, { width: NOMINAL_WIDE }, preferred), [input, preferred])
  const narrow = useMemo(() => layoutNarrow(input), [input])
  const same = false
  return (
    <figure className="m-0 flex flex-col" data-map="">
      {title && <div className="mb-3 font-mono text-label uppercase tracking-[0.14em] text-ink-muted">{title}</div>}
      <div className="w-full">
        <div className={same ? undefined : "hidden min-[720px]:block"}>
          <MapSvg layout={wide} label={label} />
        </div>
        {!same && (
          <div className="min-[720px]:hidden">
            <MapSvg layout={narrow} label={label} />
          </div>
        )}
        <EdgeSummary layout={wide} />
      </div>
      <MapLegend layout={wide} legend={legend} />
      {caption && <figcaption className="mt-3 max-w-[66ch] text-meta text-ink-muted">{caption}</figcaption>}
    </figure>
  )
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
