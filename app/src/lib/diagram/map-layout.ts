// Pure layout for `map`, `story` and legacy `box-diagram`. No DOM, no React.
//
// Nodes are text labels (glyph + label + optional sub line + hairline underline), not
// boxes. The layout is computed, not grid-placed: nodes are ranked along the data flow,
// spaced so edge labels have room, and edges are routed around other nodes. Edge labels
// are then placed by `placeEdgeLabel`, which never lets a label touch a node.
import {
  estimateTextWidth,
  inflate,
  placeEdgeLabel,
  polylineHitsRect,
  type LabelPlacement,
  type Pt,
  type Rect,
} from "./label-placement"

export type MapSignal = "new" | "risk" | "wait"
export type MapKind = "actor" | "service" | "store" | "file" | "external"

export type MapNodeSpec = { id: string; label: string; sub?: string; kind?: MapKind; signal?: MapSignal; href?: string }
export type MapEdgeSpec = {
  from: string
  to: string
  label?: string
  style?: "solid" | "dashed" | "bold"
  both?: boolean
  mark?: "added" | "changed" | "removed" | "context" | "proposed"
}
export type MapGroupSpec = { label: string; ids: string[] }
export type MapOrientation = "row" | "column"

export type MapLayoutInput = {
  nodes: readonly MapNodeSpec[]
  edges: readonly MapEdgeSpec[]
  /** The author's preference. `hub` puts the busiest node in the middle. */
  layout?: "row" | "column" | "hub"
  /** Column layouts wrap a rank into several rows so the drawing is at most this wide (px), when it can be. */
  maxWidth?: number
  /** Legacy box-diagram grid: cell ids, `null` for empty. Honoured in row orientation only. */
  grid?: readonly (readonly (string | null)[])[]
  groups?: readonly MapGroupSpec[]
}

export type LaidNode = MapNodeSpec & { rect: Rect }
export type LaidEdge = {
  index: number
  spec: MapEdgeSpec
  points: Pt[]
  placement: LabelPlacement | null
  /** Set when the label became a numbered marker. */
  marker?: number
  selfLoop: boolean
}
export type LaidGroup = { label: string; x: number; y: number; w: number }
export type MapLayout = {
  width: number
  height: number
  orientation: MapOrientation
  nodes: LaidNode[]
  edges: LaidEdge[]
  groups: LaidGroup[]
  /** Numbered labels that did not fit on the diagram. */
  markers: { n: number; text: string }[]
}

export const MAP_METRICS = {
  // Must equal the CSS tokens in globals.css (checked by a test): --fs-small, --fs-meta, --fs-meta, --fs-label.
  labelSize: 16,
  subSize: 14,
  edgeSize: 14,
  tinySize: 12,
  glyph: 20,
  nodeH: 26,
  nodeHSub: 44,
  pad: 24,
  nodeGapY: 44,
  nodeGapX: 52,
  edgeGap: 8,
  slotStep: 12,
} as const

const M = MAP_METRICS

export function measureNode(node: MapNodeSpec): { w: number; h: number } {
  const labelW = estimateTextWidth(node.label, M.labelSize, { bold: true })
  const subW = node.sub ? estimateTextWidth(node.sub, M.subSize) : 0
  return { w: Math.ceil(M.glyph + Math.max(labelW, subW) + 8), h: node.sub ? M.nodeHSub : M.nodeH }
}

function edgeLabelWidth(edge: MapEdgeSpec): number {
  return edge.label ? Math.min(estimateTextWidth(edge.label, M.edgeSize), 170) : 0
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

export function rankNodes(ids: readonly string[], edges: readonly MapEdgeSpec[]): Map<string, number> {
  const idSet = new Set(ids)
  const out = new Map(ids.map((id) => [id, [] as string[]]))
  for (const e of edges) if (e.from !== e.to && idSet.has(e.from) && idSet.has(e.to)) out.get(e.from)!.push(e.to)

  const state = new Map<string, number>()
  const back = new Set<string>()
  const visit = (u: string) => {
    state.set(u, 1)
    for (const v of out.get(u)!) {
      const s = state.get(v) ?? 0
      if (s === 1) back.add(`${u}>${v}`)
      else if (s === 0) visit(v)
    }
    state.set(u, 2)
  }
  for (const id of ids) if (!state.get(id)) visit(id)

  const preds = new Map(ids.map((id) => [id, [] as string[]]))
  const succs = new Map(ids.map((id) => [id, [] as string[]]))
  for (const e of edges) {
    if (e.from === e.to || !idSet.has(e.from) || !idSet.has(e.to) || back.has(`${e.from}>${e.to}`)) continue
    preds.get(e.to)!.push(e.from)
    succs.get(e.from)!.push(e.to)
  }

  const rank = new Map<string, number>()
  const rankOf = (id: string): number => {
    const known = rank.get(id)
    if (known !== undefined) return known
    const ps = preds.get(id)!
    const r = ps.length ? 1 + Math.max(...ps.map(rankOf)) : 0
    rank.set(id, r)
    return r
  }
  for (const id of ids) rankOf(id)
  // A source sits one rank before its earliest consumer, not at the far left.
  for (const id of ids) {
    if (preds.get(id)!.length === 0 && succs.get(id)!.length > 0) {
      rank.set(id, Math.max(0, Math.min(...succs.get(id)!.map((s) => rank.get(s)!)) - 1))
    }
  }
  return rank
}

function orderLayers(layers: string[][], edges: readonly MapEdgeSpec[]): string[][] {
  const neighbours = (id: string) => edges.flatMap((e) => (e.from === id ? [e.to] : e.to === id ? [e.from] : []))
  const result = layers.map((l) => [...l])
  const indexOf = new Map<string, number>()
  const refresh = () => result.forEach((layer) => layer.forEach((id, i) => indexOf.set(id, i)))
  refresh()
  const layerOf = new Map<string, number>()
  result.forEach((layer, li) => layer.forEach((id) => layerOf.set(id, li)))
  const sweep = (li: number, towards: number) => {
    const layer = result[li]
    const key = new Map(
      layer.map((id) => {
        const ns = neighbours(id).filter((n) => layerOf.get(n) === towards)
        const pos = ns.length ? ns.reduce((s, n) => s + indexOf.get(n)!, 0) / ns.length : indexOf.get(id)!
        return [id, pos] as const
      }),
    )
    layer.sort((a, b) => key.get(a)! - key.get(b)!)
    refresh()
  }
  for (let pass = 0; pass < 4; pass++) {
    for (let li = 1; li < result.length; li++) sweep(li, li - 1)
    for (let li = result.length - 2; li >= 0; li--) sweep(li, li + 1)
  }
  return result
}

// ---------------------------------------------------------------------------
// Node placement
// ---------------------------------------------------------------------------

type Placed = Map<string, Rect>

function labelGap(edges: readonly MapEdgeSpec[], a: Set<string>, b: Set<string>): number {
  let widest = 0
  for (const e of edges) if ((a.has(e.from) && b.has(e.to)) || (b.has(e.from) && a.has(e.to))) widest = Math.max(widest, edgeLabelWidth(e))
  return widest
}

function placeLayered(input: MapLayoutInput, orientation: MapOrientation, sizes: Map<string, { w: number; h: number }>): Placed {
  const ids = input.nodes.map((n) => n.id)
  const rank = rankNodes(ids, input.edges)
  const count = Math.max(0, ...rank.values()) + 1
  const layers: string[][] = Array.from({ length: count }, () => [])
  for (const id of ids) layers[rank.get(id)!].push(id)
  const ordered = orderLayers(layers.filter((l) => l.length), input.edges)
  const rects: Placed = new Map()

  if (orientation === "row") {
    const heights = ordered.map((l) => l.reduce((s, id) => s + sizes.get(id)!.h, 0) + (l.length - 1) * M.nodeGapY)
    const maxH = Math.max(...heights)
    let x = 0
    ordered.forEach((layer, li) => {
      const colW = Math.max(...layer.map((id) => sizes.get(id)!.w))
      let y = (maxH - heights[li]) / 2
      for (const id of layer) {
        const s = sizes.get(id)!
        rects.set(id, { x, y, w: s.w, h: s.h })
        y += s.h + M.nodeGapY
      }
      const next = ordered[li + 1]
      const gap = next ? Math.max(96, labelGap(input.edges, new Set(layer), new Set(next)) + 64) : 0
      x += colW + gap
    })
    return rects
  }

  const rowWidth = (l: string[]) => l.reduce((s, id) => s + sizes.get(id)!.w, 0) + (l.length - 1) * M.nodeGapX
  const limit = input.maxWidth ?? Infinity
  const wrapped = ordered.flatMap((layer) => {
    const rows: string[][] = [[]]
    for (const id of layer) {
      const row = rows[rows.length - 1]
      if (row.length && rowWidth([...row, id]) > limit) rows.push([id])
      else row.push(id)
    }
    return rows
  })
  ordered.splice(0, ordered.length, ...wrapped)
  const widths = ordered.map(rowWidth)
  const maxW = Math.max(...widths)
  let y = 0
  ordered.forEach((layer, li) => {
    const rowH = Math.max(...layer.map((id) => sizes.get(id)!.h))
    let x = (maxW - widths[li]) / 2
    for (const id of layer) {
      const s = sizes.get(id)!
      rects.set(id, { x, y: y + (rowH - s.h) / 2, w: s.w, h: s.h })
      x += s.w + M.nodeGapX
    }
    const next = ordered[li + 1]
    y += rowH + (next ? 64 : 0)
  })
  return rects
}

function placeGrid(grid: NonNullable<MapLayoutInput["grid"]>, input: MapLayoutInput, sizes: Map<string, { w: number; h: number }>): Placed {
  const cols = Math.max(...grid.map((r) => r.length))
  const colW = Array.from({ length: cols }, () => 0)
  const rowH = grid.map(() => 0)
  grid.forEach((row, r) =>
    row.forEach((id, c) => {
      const s = id ? sizes.get(id) : undefined
      if (!s) return
      colW[c] = Math.max(colW[c], s.w)
      rowH[r] = Math.max(rowH[r], s.h)
    }),
  )
  const widestLabel = Math.max(0, ...input.edges.map(edgeLabelWidth))
  const gapX = Math.max(112, widestLabel + 56)
  const colX: number[] = []
  let x = 0
  colW.forEach((w, c) => {
    colX[c] = x
    x += w + gapX
  })
  const rowY: number[] = []
  let y = 0
  rowH.forEach((h, r) => {
    rowY[r] = y
    y += (h || M.nodeH) + 64
  })
  const rects: Placed = new Map()
  grid.forEach((row, r) =>
    row.forEach((id, c) => {
      const s = id ? sizes.get(id) : undefined
      if (!id || !s) return
      rects.set(id, { x: colX[c] + (colW[c] - s.w) / 2, y: rowY[r] + (rowH[r] - s.h) / 2, w: s.w, h: s.h })
    }),
  )
  return rects
}

function placeHub(input: MapLayoutInput, orientation: MapOrientation, sizes: Map<string, { w: number; h: number }>): Placed {
  const degree = new Map(input.nodes.map((n) => [n.id, 0]))
  for (const e of input.edges) {
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1)
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1)
  }
  const centre = [...input.nodes].sort((a, b) => degree.get(b.id)! - degree.get(a.id)!)[0].id
  const spokes = input.nodes.map((n) => n.id).filter((id) => id !== centre)
  const first = spokes.slice(0, Math.ceil(spokes.length / 2))
  const second = spokes.slice(first.length)
  const c = sizes.get(centre)!
  const rects: Placed = new Map()
  const widestLabel = Math.max(0, ...input.edges.map(edgeLabelWidth))

  if (orientation === "row") {
    const stack = (ids: string[]) => ids.reduce((s, id) => s + sizes.get(id)!.h, 0) + Math.max(0, ids.length - 1) * M.nodeGapY
    const height = Math.max(stack(first), stack(second), c.h)
    const gap = Math.max(120, widestLabel + 72)
    const leftW = Math.max(0, ...first.map((id) => sizes.get(id)!.w))
    const place = (ids: string[], xOf: (w: number) => number) => {
      let y = (height - stack(ids)) / 2
      for (const id of ids) {
        const s = sizes.get(id)!
        rects.set(id, { x: xOf(s.w), y, w: s.w, h: s.h })
        y += s.h + M.nodeGapY
      }
    }
    const cx = leftW + (first.length ? gap : 0)
    rects.set(centre, { x: cx, y: (height - c.h) / 2, w: c.w, h: c.h })
    place(first, (w) => leftW - w)
    place(second, () => cx + c.w + gap)
    return rects
  }

  const rowOf = (ids: string[]) => ids.reduce((s, id) => s + sizes.get(id)!.w, 0) + Math.max(0, ids.length - 1) * M.nodeGapX
  const width = Math.max(rowOf(first), rowOf(second), c.w)
  const rowH = (ids: string[]) => Math.max(0, ...ids.map((id) => sizes.get(id)!.h))
  const topH = rowH(first)
  const gap = 96
  const place = (ids: string[], y: number) => {
    let x = (width - rowOf(ids)) / 2
    for (const id of ids) {
      const s = sizes.get(id)!
      rects.set(id, { x, y, w: s.w, h: s.h })
      x += s.w + M.nodeGapX
    }
  }
  place(first, 0)
  const cy = topH + (first.length ? gap : 0)
  rects.set(centre, { x: (width - c.w) / 2, y: cy, w: c.w, h: c.h })
  place(second, cy + c.h + gap)
  return rects
}

// ---------------------------------------------------------------------------
// Edge routing
// ---------------------------------------------------------------------------

type Side = "l" | "r" | "t" | "b"

function pickSides(a: Rect, b: Rect, hint: "h" | "v"): [Side, Side] {
  const gap = M.edgeGap * 2
  const hSep = a.x + a.w + gap <= b.x ? 1 : b.x + b.w + gap <= a.x ? -1 : 0
  const vSep = a.y + a.h + gap <= b.y ? 1 : b.y + b.h + gap <= a.y ? -1 : 0
  const horizontal = hint === "h" ? hSep !== 0 : vSep === 0 && hSep !== 0
  if (horizontal) return hSep > 0 ? ["r", "l"] : ["l", "r"]
  if (vSep !== 0) return vSep > 0 ? ["b", "t"] : ["t", "b"]
  return a.y <= b.y ? ["b", "t"] : ["t", "b"]
}

function sideAnchor(r: Rect, side: Side, offset: number): Pt {
  const cx = r.x + M.glyph / 2 + (r.w - M.glyph / 2) / 2 // centre of the text, not the glyph
  const cy = r.y + (r.h - 4) / 2
  const g = M.edgeGap
  switch (side) {
    case "l":
      return { x: r.x - g, y: cy + offset }
    case "r":
      return { x: r.x + r.w + g, y: cy + offset }
    case "t":
      return { x: cx + offset, y: r.y - g }
    default:
      return { x: cx + offset, y: r.y + r.h + g }
  }
}

function dedupe(points: Pt[]): Pt[] {
  const out: Pt[] = []
  for (const p of points) {
    const last = out[out.length - 1]
    if (!last || Math.abs(last.x - p.x) > 0.5 || Math.abs(last.y - p.y) > 0.5) out.push(p)
  }
  return out
}

function collides(points: readonly Pt[], obstacles: readonly Rect[]): number {
  let hits = 0
  for (const r of obstacles) if (polylineHitsRect(points, inflate(r, 6))) hits++
  return hits
}

function length(points: readonly Pt[]): number {
  let t = 0
  for (let i = 1; i < points.length; i++) t += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  return t
}

function candidatePaths(s: Pt, e: Pt, sideA: Side, straightFirst: boolean, all: readonly Rect[], lane = 0): Pt[][] {
  const horizontal = sideA === "l" || sideA === "r"
  const out: Pt[][] = []
  const flat = horizontal ? Math.abs(s.y - e.y) < 1 : Math.abs(s.x - e.x) < 1
  if (flat) out.push([s, e])
  else if (straightFirst) out.push([s, e])
  const fracs = [0.5, 0.35, 0.65, 0.2, 0.8]
  if (!flat) {
    // Hub edges: neighbouring edges bend 20px apart, so parallel runs never share a lane.
    const span = Math.abs(horizontal ? e.x - s.x : e.y - s.y) || 1
    const shifted = Math.min(0.8, Math.max(0.2, 0.5 + ((lane % 3) - 1) * (20 / span)))
    for (const f of straightFirst ? [shifted, ...fracs] : fracs) {
      out.push(horizontal ? [s, { x: s.x + (e.x - s.x) * f, y: s.y }, { x: s.x + (e.x - s.x) * f, y: e.y }, e] : [s, { x: s.x, y: s.y + (e.y - s.y) * f }, { x: e.x, y: s.y + (e.y - s.y) * f }, e])
    }
  }
  // Last resorts: loop around the whole group of nodes.
  const minX = Math.min(...all.map((r) => r.x)) - 24
  const maxX = Math.max(...all.map((r) => r.x + r.w)) + 24
  const minY = Math.min(...all.map((r) => r.y)) - 24
  const maxY = Math.max(...all.map((r) => r.y + r.h)) + 24
  const sd = horizontal ? Math.sign(e.x - s.x) || 1 : Math.sign(e.y - s.y) || 1
  for (const lane of horizontal ? [minY, maxY] : [minX, maxX]) {
    out.push(
      horizontal
        ? [s, { x: s.x + sd * 14, y: s.y }, { x: s.x + sd * 14, y: lane }, { x: e.x - sd * 14, y: lane }, { x: e.x - sd * 14, y: e.y }, e]
        : [s, { x: s.x, y: s.y + sd * 14 }, { x: lane, y: s.y + sd * 14 }, { x: lane, y: e.y - sd * 14 }, { x: e.x, y: e.y - sd * 14 }, e],
    )
  }
  return out.map(dedupe)
}

function routeEdges(
  edges: readonly MapEdgeSpec[],
  rects: Placed,
  hint: "h" | "v",
  straightFirst: boolean,
  back: ReadonlySet<number> = new Set(),
): { index: number; points: Pt[]; selfLoop: boolean }[] {
  const all = [...rects.values()]
  const maxRight = Math.max(...all.map((r) => r.x + r.w))
  const maxBottom = Math.max(...all.map((r) => r.y + r.h))
  let lane = 0
  type End = { edge: number; end: "a" | "b"; other: number }
  const slots = new Map<string, End[]>()
  const sides = new Map<number, [Side, Side]>()
  edges.forEach((e, i) => {
    const a = rects.get(e.from)
    const b = rects.get(e.to)
    if (!a || !b || e.from === e.to) return
    const [sa, sb] = pickSides(a, b, hint)
    sides.set(i, [sa, sb])
    const push = (id: string, side: Side, end: "a" | "b", other: Rect) => {
      const perp = side === "l" || side === "r" ? other.y + other.h / 2 : other.x + other.w / 2
      const key = `${id}:${side}`
      slots.set(key, [...(slots.get(key) ?? []), { edge: i, end, other: perp }])
    }
    push(e.from, sa, "a", b)
    push(e.to, sb, "b", a)
  })
  const offsetOf = new Map<string, number>()
  for (const [key, ends] of slots) {
    ends.sort((x, y) => x.other - y.other)
    const k = ends.length
    const [id, side] = key.split(":") as [string, Side]
    const r = rects.get(id)!
    const limit = ((side === "l" || side === "r" ? r.h - 4 : r.w - M.glyph) - 6) / 2
    const step = Math.min(M.slotStep, k > 1 ? (limit * 2) / (k - 1) : M.slotStep)
    ends.forEach((end, i) => offsetOf.set(`${end.edge}:${end.end}`, (i - (k - 1) / 2) * step))
  }

  return edges.map((e, index) => {
    const a = rects.get(e.from)
    const b = rects.get(e.to)
    if (!a || !b) return { index, points: [], selfLoop: false }
    if (e.from === e.to) {
      const x = a.x + a.w - 18
      const top = a.y - M.edgeGap
      return { index, selfLoop: true, points: [{ x: x - 16, y: top }, { x: x - 16, y: top - 18 }, { x, y: top - 18 }, { x, y: top }] }
    }
    if (back.has(index)) {
      // Back edges (against the flow) run on their own lane outside the diagram.
      const k = lane++
      if (hint === "v") {
        const laneX = maxRight + 28 + k * 20
        const ay = a.y + (a.h - 4) / 2
        const by = b.y + (b.h - 4) / 2
        return { index, selfLoop: false, points: [{ x: a.x + a.w + M.edgeGap, y: ay }, { x: laneX, y: ay }, { x: laneX, y: by }, { x: b.x + b.w + M.edgeGap, y: by }] }
      }
      const laneY = maxBottom + 30 + k * 20
      const ax = a.x + (a.w + M.glyph) / 2
      const bx = b.x + (b.w + M.glyph) / 2
      return { index, selfLoop: false, points: [{ x: ax, y: a.y + a.h + M.edgeGap }, { x: ax, y: laneY }, { x: bx, y: laneY }, { x: bx, y: b.y + b.h + M.edgeGap }] }
    }
    const [sa, sb] = sides.get(index)!
    const s = sideAnchor(a, sa, offsetOf.get(`${index}:a`) ?? 0)
    const t = sideAnchor(b, sb, offsetOf.get(`${index}:b`) ?? 0)
    // Near-aligned ends: draw one straight line instead of a small jog.
    if (sa === "l" || sa === "r") {
      const lo = Math.max(a.y + 4, b.y + 4)
      const hi = Math.min(a.y + a.h - 8, b.y + b.h - 8)
      if (Math.abs(s.y - t.y) < 22 && lo <= hi) {
        const y = Math.min(hi, Math.max(lo, (s.y + t.y) / 2))
        s.y = y
        t.y = y
      }
    } else {
      const textL = (r: Rect) => r.x + M.glyph
      const lo = Math.max(textL(a), textL(b)) + 6
      const hi = Math.min(a.x + a.w, b.x + b.w) - 6
      if (Math.abs(s.x - t.x) < 40 && lo <= hi) {
        const x = Math.min(hi, Math.max(lo, (s.x + t.x) / 2))
        s.x = x
        t.x = x
      }
    }
    const obstacles = all.filter((r) => r !== a && r !== b)
    let best: Pt[] | null = null
    let bestScore = Infinity
    for (const candidate of candidatePaths(s, t, sa, straightFirst, all, index)) {
      const hits = collides(candidate, obstacles)
      const score = hits * 10_000 + length(candidate)
      if (hits === 0 && best === null) {
        best = candidate
        bestScore = score
        break
      }
      if (score < bestScore) {
        best = candidate
        bestScore = score
      }
    }
    return { index, points: best ?? [s, t], selfLoop: false }
  })
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function translate(layout: MapLayout, dx: number, dy: number): MapLayout {
  const moveRect = (r: Rect): Rect => ({ ...r, x: r.x + dx, y: r.y + dy })
  const movePt = (p: Pt): Pt => ({ x: p.x + dx, y: p.y + dy })
  return {
    ...layout,
    nodes: layout.nodes.map((n) => ({ ...n, rect: moveRect(n.rect) })),
    edges: layout.edges.map((e) => ({
      ...e,
      points: e.points.map(movePt),
      placement: !e.placement ? null : e.placement.kind === "inline" ? { ...e.placement, rect: moveRect(e.placement.rect) } : { ...e.placement, at: movePt(e.placement.at) },
    })),
    groups: layout.groups.map((g) => ({ ...g, x: g.x + dx, y: g.y + dy })),
  }
}

/** Proper crossings between routed edges (touching ends do not count). */
export function countCrossings(layout: Pick<MapLayout, "edges">): number {
  const segs = layout.edges.map((e) => {
    const out: [Pt, Pt][] = []
    for (let i = 1; i < e.points.length; i++) out.push([e.points[i - 1], e.points[i]])
    return out
  })
  const cross = (a: Pt, b: Pt, c: Pt, d: Pt) => {
    const o = (p: Pt, q: Pt, r: Pt) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
    const d1 = o(a, b, c)
    const d2 = o(a, b, d)
    const d3 = o(c, d, a)
    const d4 = o(c, d, b)
    return d1 * d2 < -1e-6 && d3 * d4 < -1e-6
  }
  let n = 0
  for (let i = 0; i < segs.length; i++)
    for (let j = i + 1; j < segs.length; j++)
      if (segs[i].some(([a, b]) => segs[j].some(([c, d]) => cross(a, b, c, d)))) n++
  return n
}

export function layoutMap(input: MapLayoutInput, orientation: MapOrientation): MapLayout {
  const hub = layoutMapWith(input, orientation, true)
  if (input.layout !== "hub" || input.nodes.length <= 2) return hub
  // A hub only reads well when it is a real star. Otherwise a layered layout often crosses less.
  const layered = layoutMapWith(input, orientation, false)
  const ch = countCrossings(hub)
  const cl = countCrossings(layered)
  if (cl < ch) return layered
  // A hub is only honest for a star: every edge touches the centre. Anything else reads better layered.
  const degree = new Map<string, number>()
  for (const e of input.edges) for (const id of [e.from, e.to]) degree.set(id, (degree.get(id) ?? 0) + 1)
  const centre = [...degree.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const star = input.edges.every((e) => e.from === centre || e.to === centre)
  if (cl === ch && !star) return layered
  if (cl === ch && layered.width * layered.height < hub.width * hub.height * 0.8) return layered
  return hub
}

function layoutMapWith(input: MapLayoutInput, orientation: MapOrientation, allowHub: boolean): MapLayout {
  const sizes = new Map(input.nodes.map((n) => [n.id, measureNode(n)]))
  const hub = allowHub && input.layout === "hub" && input.nodes.length > 2
  const effective: MapOrientation = input.layout === "column" ? "column" : orientation
  const useGrid = !!input.grid && effective === "row" && !hub
  const rects = useGrid
    ? placeGrid(input.grid!, input, sizes)
    : hub
      ? placeHub(input, orientation, sizes)
      : placeLayered(input, effective, sizes)
  // Anything the grid forgot still gets a place (below everything else).
  let spill = Math.max(0, ...[...rects.values()].map((r) => r.y + r.h)) + 64
  for (const n of input.nodes) {
    if (rects.has(n.id)) continue
    const s = sizes.get(n.id)!
    rects.set(n.id, { x: 0, y: spill, w: s.w, h: s.h })
    spill += s.h + 32
  }

  const hint: "h" | "v" = hub ? (orientation === "row" ? "h" : "v") : effective === "row" ? "h" : "v"
  const back = new Set<number>()
  if (!useGrid && !hub) {
    const rank = rankNodes(input.nodes.map((n) => n.id), input.edges)
    input.edges.forEach((e, i) => {
      if (e.from !== e.to && (rank.get(e.from) ?? 0) > (rank.get(e.to) ?? 0)) back.add(i)
    })
  }
  const routes = routeEdges(input.edges, rects, hint, hub, back)
  const nodeRects = [...rects.values()]
  const placed: Rect[] = []
  const laid: LaidEdge[] = []
  const markers: { n: number; text: string }[] = []
  // Longest labels first: they have the fewest places to go.
  const order = input.edges.map((_, i) => i).sort((a, b) => (input.edges[b].label?.length ?? 0) - (input.edges[a].label?.length ?? 0))
  const placements = new Map<number, LabelPlacement | null>()
  // With a width limit, labels may use the slack beside the drawing but never widen it.
  let bounds: { minX: number; maxX: number } | undefined
  if (input.maxWidth) {
    const px = [...nodeRects.flatMap((r) => [r.x, r.x + r.w]), ...routes.flatMap((r) => r.points.map((p) => p.x))]
    const lo = Math.min(...px)
    const hi = Math.max(...px)
    const slack = Math.max(0, input.maxWidth - (hi - lo))
    bounds = { minX: lo - slack / 2, maxX: hi + slack / 2 }
  }
  for (const i of order) {
    const e = input.edges[i]
    const route = routes[i]
    if (!e.label || route.points.length < 2) {
      placements.set(i, null)
      continue
    }
    const placement = placeEdgeLabel(route.points, e.label, {
      bounds,
      fontSize: M.edgeSize,
      nodes: nodeRects,
      labels: placed,
      paths: routes.filter((r) => r.index !== i && r.points.length > 1).map((r) => r.points),
    })
    if (placement.kind === "inline") placed.push(placement.rect)
    placements.set(i, placement)
  }
  input.edges.forEach((e, i) => {
    const placement = placements.get(i) ?? null
    let marker: number | undefined
    if (placement?.kind === "marker" && e.label) {
      marker = markers.length + 1
      markers.push({ n: marker, text: e.label })
    }
    laid.push({ index: i, spec: e, points: routes[i].points, placement, marker, selfLoop: routes[i].selfLoop })
  })

  const nodes: LaidNode[] = input.nodes.map((n) => ({ ...n, rect: rects.get(n.id)! }))
  const groups: LaidGroup[] = (input.groups ?? []).flatMap((g) => {
    const rs = g.ids.map((id) => rects.get(id)).filter((r): r is Rect => !!r)
    if (!rs.length) return []
    const x = Math.min(...rs.map((r) => r.x))
    const right = Math.max(...rs.map((r) => r.x + r.w))
    return [{ label: g.label, x, y: Math.min(...rs.map((r) => r.y)) - 30, w: right - x }]
  })

  const xs: number[] = []
  const ys: number[] = []
  const grow = (r: Rect) => {
    xs.push(r.x, r.x + r.w)
    ys.push(r.y, r.y + r.h)
  }
  nodes.forEach((n) => grow(n.rect))
  laid.forEach((e) => {
    e.points.forEach((p) => {
      xs.push(p.x)
      ys.push(p.y)
    })
    if (e.placement?.kind === "inline") grow(e.placement.rect)
    if (e.placement?.kind === "marker") grow({ x: e.placement.at.x - 9, y: e.placement.at.y - 9, w: 18, h: 18 })
  })
  groups.forEach((g) => grow({ x: g.x, y: g.y - 12, w: g.w, h: 14 }))
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const result: MapLayout = {
    width: Math.ceil(Math.max(...xs) - minX + M.pad * 2),
    height: Math.ceil(Math.max(...ys) - minY + M.pad * 2),
    orientation: hub ? orientation : effective,
    nodes,
    edges: laid,
    groups,
    markers,
  }
  return translate(result, M.pad - minX, M.pad - minY)
}

/** Scale at which a layout fits a box (1 = natural size). `height` is optional for full-width maps. */
export function fitScale(layout: MapLayout, width: number, height?: number): number {
  const w = width / layout.width
  const h = height ? height / layout.height : Infinity
  return Math.min(1, w, h)
}

/**
 * Orientation choice from content and a nominal box, never from a measured element,
 * so server render, first paint and later renders agree.
 */
/** Widest drawing that still renders at full size in a 390px phone (content column 350px, text never below ~93 %). */
export const NARROW_LAYOUT_WIDTH = 300
export const NARROW_MAX_RENDER_WIDTH = 376

/** Phone layout: always a column, ranks wrap into rows, never a symmetric hub. Text stays at natural size. */
export function layoutNarrow(input: MapLayoutInput): MapLayout {
  return layoutMapWith({ ...input, layout: input.layout === "hub" ? undefined : input.layout, maxWidth: NARROW_LAYOUT_WIDTH }, "column", false)
}

export function pickOrientation(input: MapLayoutInput, nominal: { width: number; height?: number }, preferred: MapOrientation = "row"): MapLayout {
  const other: MapOrientation = preferred === "row" ? "column" : "row"
  const a = layoutMap(input, preferred)
  if (input.layout === "column") return layoutMap(input, "column")
  const b = layoutMap(input, other)
  return fitScale(b, nominal.width, nominal.height) > fitScale(a, nominal.width, nominal.height) * 1.15 ? b : a
}

/**
 * A window of at most `w` x `h` (drawing units) around the given nodes, clamped to the drawing.
 * Phones show this window at natural size instead of the whole drawing shrunk.
 */
export function focusCrop(layout: Pick<MapLayout, "width" | "height" | "nodes">, ids: ReadonlySet<string>, w: number, h: number): Rect {
  const cw = Math.min(w, layout.width)
  const ch = Math.min(h, layout.height)
  const rs = layout.nodes.filter((n) => ids.has(n.id)).map((n) => n.rect)
  if (!rs.length) return { x: 0, y: 0, w: cw, h: ch }
  const cx = (Math.min(...rs.map((r) => r.x)) + Math.max(...rs.map((r) => r.x + r.w))) / 2
  const cy = (Math.min(...rs.map((r) => r.y)) + Math.max(...rs.map((r) => r.y + r.h))) / 2
  const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v))
  return { x: clamp(cx - cw / 2, layout.width - cw), y: clamp(cy - ch / 2, layout.height - ch), w: cw, h: ch }
}
