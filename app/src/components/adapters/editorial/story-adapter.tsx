"use client"

// story: one diagram that assembles as the reader scrolls. Each beat adds nodes
// (`show`) and lights some of them (`focus`). Earlier beats stay visible.
// Scroll position is the state. Reduced motion, and the first paint before hydration,
// show the full diagram with no dimming and no sticky stage.
//
// The diagram is rendered by Mermaid (see components/mermaid/map-mermaid.tsx). Beats toggle
// opacity on its rendered nodes and edges. On phones the stage scrolls sideways at natural size.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"

import type { AdapterArgs } from "@/components/artifact-types"
import { EdgeSummary, MapCanvas, MapLegend, useMapSvg } from "@/components/mermaid/map-mermaid"
import { Prose } from "@/components/ui/prose"
import { normalizeBoxEdges } from "@/lib/contract/artifact-manifest"
import type { MapInput } from "@/lib/diagram/map-to-mermaid"
import { cn } from "@/lib/utils"

import { usePrefersReducedMotion } from "../plan/diagram-svg"

const subscribeNever = () => () => {}
/** Viewport line (fraction from the top) a beat's top must pass to become the current one. */
const ACTIVATE_AT = 0.45
const DIM_OPACITY = 0.25
const GHOST_OPACITY = 0.18

/** The current beat: the last one whose top is above the line. Before the first reaches it, beat 0. */
export function activeBeat(tops: readonly number[], viewportHeight: number): number {
  const line = viewportHeight * ACTIVATE_AT
  let active = 0
  tops.forEach((top, i) => {
    if (top <= line) active = i
  })
  return active
}

export function renderStory({ node }: AdapterArgs<"story">) {
  return <Story node={node} />
}

function Story({ node }: Pick<AdapterArgs<"story">, "node">) {
  const { caption, diagram, beats } = node.props
  const reduced = usePrefersReducedMotion()
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false)
  const [active, setActive] = useState(0)
  const beatRefs = useRef<(HTMLLIElement | null)[]>([])
  const canvasRef = useRef<HTMLDivElement>(null)

  const input = useMemo<MapInput>(
    () => ({ nodes: diagram.nodes, edges: normalizeBoxEdges(diagram.edges).edges, layout: diagram.layout, fitWidth: 760 }),
    [diagram],
  )
  const { svg, compiled, error } = useMapSvg(input)

  const interactive = mounted && !reduced

  useEffect(() => {
    if (!interactive) return
    let frame = 0
    const update = () => {
      frame = 0
      const tops = beatRefs.current.map((el) => el?.getBoundingClientRect().top ?? Infinity)
      setActive(activeBeat(tops, window.innerHeight))
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [interactive])

  const visible = useMemo(() => {
    if (!interactive) return undefined
    const ids = new Set<string>()
    for (let i = 0; i <= active; i++) beats[i].show.forEach((id) => ids.add(id))
    return ids
  }, [interactive, active, beats])
  const focus = useMemo(() => (interactive ? new Set(beats[active].focus ?? []) : undefined), [interactive, active, beats])

  // Beats act on the rendered Mermaid SVG: nodes by data-mm-node, edges by data-mm-edge.
  // Not yet shown = ghosted; shown but outside a non-empty focus set = dimmed.
  useEffect(() => {
    const root = canvasRef.current
    if (!root || !svg) return
    const mm = (id: string) => compiled.nodeIds.get(id)
    const shown = visible && new Set([...visible].map(mm))
    const lit = focus && focus.size > 0 ? new Set([...focus].map(mm)) : undefined
    const transition = interactive ? "opacity 300ms ease-out, filter 300ms ease-out" : ""
    // Nothing is hidden. Not yet revealed = ghosted (faint, no colour); revealed but outside a
    // non-empty focus set = dimmed; everything else = full strength.
    const apply = (el: Element, show: boolean, dim: boolean) => {
      const style = (el as SVGElement).style
      style.transition = transition
      style.opacity = !show ? String(GHOST_OPACITY) : dim ? String(DIM_OPACITY) : ""
      style.filter = !show ? "grayscale(1)" : ""
    }
    root.querySelectorAll<SVGGElement>("[data-mm-node]").forEach((el) => {
      const id = el.dataset.mmNode!
      apply(el, !shown || shown.has(id), !!lit && !lit.has(id))
    })
    compiled.edges.forEach((edge, i) => {
      const show = !shown || (shown.has(edge.from) && shown.has(edge.to))
      const dim = !!lit && !(lit.has(edge.from) && lit.has(edge.to))
      root.querySelectorAll(`[data-mm-edge="${i}"]`).forEach((el) => apply(el, show, dim))
    })
  }, [svg, compiled, visible, focus, interactive])

  return (
    <figure
      className="m-0 grid grid-cols-[minmax(0,1fr)] gap-x-8 min-[1100px]:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)]"
      data-story=""
      data-active={interactive ? active : undefined}
      aria-label={caption}
    >
      <div
        className={cn(
          interactive &&
            "sticky top-[var(--header-height)] z-10 -mx-4 max-h-[46svh] overflow-auto bg-background px-4 pb-2 pt-2 min-[1100px]:top-[calc(var(--header-height)+1rem)] min-[1100px]:mx-0 min-[1100px]:max-h-[calc(100svh-var(--header-height)-2rem)] min-[1100px]:self-start min-[1100px]:bg-transparent min-[1100px]:px-0 min-[1100px]:pb-0",
        )}
      >
        <div className="flex min-h-0 flex-col justify-center">
          <MapCanvas svg={svg} label={caption} error={error} svgRef={canvasRef} compiled={compiled} maxScale={1.6} />
        </div>
        <MapLegend compiled={compiled} nodes={input.nodes} legend={diagram.legend} />
        <EdgeSummary input={input} />
      </div>
      <ol className="m-0 list-none p-0">
        {beats.map((beat, index) => (
          <li
            key={index}
            ref={(el) => {
              beatRefs.current[index] = el
            }}
            data-beat={index}
            className={cn(
              "flex flex-col justify-center",
              interactive ? "py-4 min-[1100px]:min-h-[14svh]" : "py-2",
              interactive && "transition-opacity duration-300 ease-out",
              interactive && index !== active && "opacity-65",
            )}
          >
            <div className="mb-1 font-mono text-label uppercase tracking-[0.14em] text-ink-muted">
              {index + 1} / {beats.length}
            </div>
            <div className="max-w-[44ch] text-body">
              <Prose>{beat.text}</Prose>
            </div>
          </li>
        ))}
      </ol>
      <figcaption className="mt-4 min-[1100px]:col-span-2 max-w-[66ch] text-meta text-ink-muted">{caption}</figcaption>
    </figure>
  )
}
