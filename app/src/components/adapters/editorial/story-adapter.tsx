"use client"

// story: one diagram that assembles as the reader scrolls. Each beat adds nodes
// (`show`) and lights some of them (`focus`). Earlier beats stay visible.
// Scroll position is the state. Reduced motion, and the first paint before hydration,
// show the full diagram with no dimming and no sticky stage.
//
// Desktop: sticky stage under the site header, full diagram scaled to fill it.
// Phone: the layout is a narrow column drawn at natural size; the stage shows a window
// around the current beat's nodes so text never shrinks (tap "Show full map" for all of it).
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"

import type { AdapterArgs } from "@/components/artifact-types"
import { Prose } from "@/components/ui/prose"
import { normalizeBoxEdges } from "@/lib/contract/artifact-manifest"
import { focusCrop, layoutNarrow, pickOrientation, type MapLayoutInput } from "@/lib/diagram/map-layout"
import { cn } from "@/lib/utils"

import { EdgeSummary, MapLegend, MapSvg, usePrefersReducedMotion } from "../plan/diagram-svg"

const subscribeNever = () => () => {}
/** Viewport line (fraction from the top) a beat's top must pass to become the current one. */
const ACTIVATE_AT = 0.45
const CROP_W = 340
const CROP_H = 250

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
  const [expanded, setExpanded] = useState(false)
  const beatRefs = useRef<(HTMLLIElement | null)[]>([])

  const input = useMemo<MapLayoutInput>(
    () => ({ nodes: diagram.nodes, edges: normalizeBoxEdges(diagram.edges).edges, layout: diagram.layout }),
    [diagram],
  )
  // Layouts come from content, never from a measured box. CSS (1100px) picks which one shows.
  const preferred = diagram.layout === "column" ? "column" : "row"
  const wide = useMemo(() => pickOrientation(input, { width: 640, height: 480 }, preferred), [input, preferred])
  const narrow = useMemo(() => layoutNarrow(input), [input])

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
  const crop = useMemo(() => {
    if (!interactive || expanded) return undefined
    return focusCrop(narrow, focus && focus.size ? focus : (visible ?? new Set()), CROP_W, CROP_H)
  }, [interactive, expanded, narrow, focus, visible])
  const cropped = !!crop && (crop.w < narrow.width || crop.h < narrow.height)

  return (
    <figure
      className="m-0 grid gap-x-12 min-[1100px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
      data-story=""
      data-active={interactive ? active : undefined}
      aria-label={caption}
    >
      <div
        className={cn(
          interactive &&
            "sticky z-10 -mx-4 bg-background px-4 pb-2 pt-2 top-[var(--header-height)] min-[1100px]:top-[calc(var(--header-height)+1rem)] min-[1100px]:mx-0 min-[1100px]:self-start min-[1100px]:bg-transparent min-[1100px]:px-0 min-[1100px]:pb-0",
          interactive && "max-h-[46svh] min-[1100px]:h-[calc(100svh-var(--header-height)-2rem)] min-[1100px]:max-h-none",
        )}
      >
        <div className={cn("flex min-h-0 flex-col justify-center", interactive && "h-full max-h-full overflow-hidden", interactive && expanded && "overflow-auto")}>
          <div className="hidden min-h-0 min-[1100px]:block">
            <MapSvg
              layout={wide}
              label={caption}
              visible={visible}
              focus={focus}
              animate={interactive}
              maxScale={2.4}
              className={interactive ? "max-h-[calc(100svh-var(--header-height)-7rem)]" : undefined}
            />
          </div>
          <div className="min-h-0 min-[1100px]:hidden">
            <MapSvg layout={narrow} label={caption} visible={visible} focus={focus} animate={interactive} crop={crop} />
          </div>
        </div>
        <div className="flex items-baseline justify-between gap-4 min-[1100px]:block">
          <MapLegend layout={wide} legend={diagram.legend} />
          {interactive && (cropped || expanded) && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="mt-3 shrink-0 text-meta text-ink-muted underline underline-offset-4 min-[1100px]:hidden"
            >
              {expanded ? "Follow the story" : "Show full map"}
            </button>
          )}
        </div>
        <EdgeSummary layout={wide} />
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
              "flex flex-col justify-center py-6",
              interactive ? "min-h-[30svh] min-[1100px]:min-h-[44svh]" : "py-3",
              interactive && "transition-opacity duration-300 ease-out",
              interactive && index !== active && "opacity-65",
            )}
          >
            <div className="mb-2 font-mono text-label uppercase tracking-[0.14em] text-ink-muted">
              {index + 1} / {beats.length}
            </div>
            <div className="max-w-[44ch] text-body">
              <Prose>{beat.text}</Prose>
            </div>
          </li>
        ))}
      </ol>
      <figcaption className="mt-4 max-w-[66ch] text-meta text-ink-muted min-[1100px]:col-span-2">{caption}</figcaption>
    </figure>
  )
}
