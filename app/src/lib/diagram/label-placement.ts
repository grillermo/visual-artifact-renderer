// Pure edge-label placement for diagrams. No DOM, so it runs the same in tests,
// static export and the browser.
//
// A label never sits under a node. Candidates are tried in a fixed order: above the
// midpoint, below it, then 30 % and 70 % along the edge, then lifted a little further
// off the line. If nothing fits the label wraps to two lines and retries. As a last
// resort it becomes a numbered marker on the edge and the caller lists the text under
// the diagram.

export type Pt = { x: number; y: number }
export type Rect = { x: number; y: number; w: number; h: number }

export const NODE_CLEARANCE = 6
export const LABEL_CLEARANCE = 4

export function inflate(rect: Rect, by: number): Rect {
  return { x: rect.x - by, y: rect.y - by, w: rect.w + by * 2, h: rect.h + by * 2 }
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function inside(rect: Rect, p: Pt) {
  return p.x >= rect.x && p.x <= rect.x + rect.w && p.y >= rect.y && p.y <= rect.y + rect.h
}

function segmentsCross(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const orient = (p: Pt, q: Pt, r: Pt) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
  const o1 = orient(a, b, c)
  const o2 = orient(a, b, d)
  const o3 = orient(c, d, a)
  const o4 = orient(c, d, b)
  return o1 * o2 < 0 && o3 * o4 < 0
}

export function segmentHitsRect(p: Pt, q: Pt, rect: Rect): boolean {
  if (inside(rect, p) || inside(rect, q)) return true
  const tl = { x: rect.x, y: rect.y }
  const tr = { x: rect.x + rect.w, y: rect.y }
  const br = { x: rect.x + rect.w, y: rect.y + rect.h }
  const bl = { x: rect.x, y: rect.y + rect.h }
  return segmentsCross(p, q, tl, tr) || segmentsCross(p, q, tr, br) || segmentsCross(p, q, br, bl) || segmentsCross(p, q, bl, tl)
}

export function polylineHitsRect(points: readonly Pt[], rect: Rect): boolean {
  for (let i = 1; i < points.length; i++) if (segmentHitsRect(points[i - 1], points[i], rect)) return true
  return false
}

// ---------------------------------------------------------------------------
// Text measuring (estimate). Close enough to Geist/system sans at layout time;
// callers add slack so a real glyph run never exceeds its rectangle.
// ---------------------------------------------------------------------------

const NARROW = new Set("iljtfr.,;:'!|()[] /-\u2019")
const WIDE = new Set("mwMW@")

export function estimateTextWidth(text: string, fontSize: number, options: { mono?: boolean; bold?: boolean } = {}): number {
  if (options.mono) return text.length * fontSize * 0.6
  let em = 0
  for (const ch of text) {
    if (NARROW.has(ch)) em += 0.32
    else if (WIDE.has(ch)) em += 0.88
    else if (ch >= "A" && ch <= "Z") em += 0.66
    else if (ch >= "0" && ch <= "9") em += 0.57
    else em += 0.54
  }
  return em * fontSize * (options.bold ? 1.07 : 1.03)
}

/** Greedy word wrap to at most `maxChars` per line. Words longer than the limit stay whole. */
export function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ""
  for (const word of words) {
    if (line && line.length + 1 + word.length > maxChars) {
      lines.push(line)
      line = word
    } else {
      line = line ? `${line} ${word}` : word
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : [text]
}

/** Splits near the middle at a space, or returns one line when there is none. */
export function splitInTwo(text: string): string[] {
  const spaces: number[] = []
  for (let i = 0; i < text.length; i++) if (text[i] === " ") spaces.push(i)
  if (!spaces.length) return [text]
  const mid = text.length / 2
  const at = spaces.reduce((best, s) => (Math.abs(s - mid) < Math.abs(best - mid) ? s : best), spaces[0])
  return [text.slice(0, at), text.slice(at + 1)]
}

// ---------------------------------------------------------------------------
// Polyline helpers
// ---------------------------------------------------------------------------

export function pointAlong(points: readonly Pt[], t: number): { p: Pt; dir: Pt } {
  const lengths: number[] = []
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const len = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    lengths.push(len)
    total += len
  }
  let target = total * t
  for (let i = 0; i < lengths.length; i++) {
    if (target <= lengths[i] || i === lengths.length - 1) {
      const a = points[i]
      const b = points[i + 1]
      const k = lengths[i] === 0 ? 0 : Math.min(1, target / lengths[i])
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = Math.hypot(dx, dy) || 1
      return { p: { x: a.x + dx * k, y: a.y + dy * k }, dir: { x: dx / len, y: dy / len } }
    }
    target -= lengths[i]
  }
  return { p: points[0], dir: { x: 1, y: 0 } }
}

// ---------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------

export type LabelPlacement =
  | { kind: "inline"; rect: Rect; lines: string[]; fontSize: number; lineHeight: number; wrapped: boolean }
  | { kind: "marker"; at: Pt; radius: number }

export type PlaceOptions = {
  fontSize?: number
  /** Node rectangles, hard obstacles (inflated internally by NODE_CLEARANCE). */
  nodes: readonly Rect[]
  /** Label rectangles already placed. */
  labels: readonly Rect[]
  /** Other edges' polylines, a soft obstacle: dropped in the relaxed pass. */
  paths?: readonly (readonly Pt[])[]
  /** Horizontal limits a label must stay inside. */
  bounds?: { minX: number; maxX: number }
}

const T_ORDER = [0.5, 0.3, 0.7, 0.2, 0.8]
const LIFTS = [0, 16, 32]

function candidateRects(points: readonly Pt[], w: number, h: number): Rect[] {
  const out: Rect[] = []
  for (const lift of LIFTS) {
    for (const t of T_ORDER) {
      const { p, dir } = pointAlong(points, t)
      let nx = -dir.y
      let ny = dir.x
      // "Above" first for flat edges, "right" first for upright ones.
      if (Math.abs(dir.x) >= Math.abs(dir.y) ? ny > 0 : nx < 0) {
        nx = -nx
        ny = -ny
      }
      const reach = Math.abs(nx) * (w / 2) + Math.abs(ny) * (h / 2) + 4 + lift
      for (const side of [1, -1]) {
        const cx = p.x + nx * reach * side
        const cy = p.y + ny * reach * side
        out.push({ x: cx - w / 2, y: cy - h / 2, w, h })
      }
    }
  }
  return out
}

function fits(rect: Rect, options: PlaceOptions, ownPoints: readonly Pt[], useEdges: boolean): boolean {
  if (options.bounds && (rect.x < options.bounds.minX || rect.x + rect.w > options.bounds.maxX)) return false
  for (const node of options.nodes) if (rectsOverlap(rect, inflate(node, NODE_CLEARANCE))) return false
  for (const label of options.labels) if (rectsOverlap(rect, inflate(label, LABEL_CLEARANCE))) return false
  if (polylineHitsRect(ownPoints, rect)) return false
  if (useEdges) for (const path of options.paths ?? []) if (polylineHitsRect(path, rect)) return false
  return true
}

function measure(lines: readonly string[], fontSize: number) {
  const lineHeight = Math.round(fontSize * 1.3)
  const w = Math.max(...lines.map((line) => estimateTextWidth(line, fontSize))) + 8
  return { w, h: lines.length * lineHeight + 4, lineHeight }
}

export function placeEdgeLabel(points: readonly Pt[], text: string, options: PlaceOptions): LabelPlacement {
  const fontSize = options.fontSize ?? 13
  const variants: string[][] = [[text]]
  const two = splitInTwo(text)
  if (two.length === 2) variants.push(two)

  // Strict passes first (avoid other edges too), then relaxed (nodes and labels only).
  for (const useEdges of [true, false]) {
    for (let v = 0; v < variants.length; v++) {
      const lines = variants[v]
      const { w, h, lineHeight } = measure(lines, fontSize)
      for (const rect of candidateRects(points, w, h)) {
        if (fits(rect, options, points, useEdges)) return { kind: "inline", rect, lines, fontSize, lineHeight, wrapped: v > 0 }
      }
    }
  }
  const { p } = pointAlong(points, 0.5)
  return { kind: "marker", at: p, radius: 9 }
}
