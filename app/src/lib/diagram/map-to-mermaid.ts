// Pure compiler: `map` JSON -> Mermaid flowchart text. Mermaid does the layout and routing.
// Every piece of user text is escaped here, so the result is safe for HTML labels.
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
export type MapDirection = "LR" | "TB"
export type MapInput = {
  nodes: readonly MapNodeSpec[]
  edges: readonly MapEdgeSpec[]
  layout?: "row" | "column" | "hub"
  /** Width (px) the drawing should fit before it scrolls sideways. Defaults to MAP_FIT_WIDTH. */
  fitWidth?: number
}

/** Edges that close a cycle (found by depth-first search over the edge order). */
export function backEdgeIndexes(input: MapInput): Set<number> {
  const out = new Map<string, { to: string; index: number }[]>()
  input.edges.forEach((e, index) => {
    if (e.from === e.to) return
    out.set(e.from, [...(out.get(e.from) ?? []), { to: e.to, index }])
  })
  const state = new Map<string, 1 | 2>()
  const back = new Set<number>()
  const visit = (u: string) => {
    state.set(u, 1)
    for (const { to, index } of out.get(u) ?? []) {
      const st = state.get(to)
      if (st === 1) back.add(index)
      else if (!st) visit(to)
    }
    state.set(u, 2)
  }
  for (const n of input.nodes) if (!state.get(n.id)) visit(n.id)
  return back
}

export type CompiledMap = {
  code: string
  direction: MapDirection
  /** Original node id -> Mermaid node id. */
  nodeIds: ReadonlyMap<string, string>
  /** Edge index -> the Mermaid ids of its ends, used by `story` to find rendered edges. */
  edges: readonly { index: number; from: string; to: string; spec: MapEdgeSpec; reversed: boolean }[]
}

const SIGNAL_VAR: Record<MapSignal, string> = {
  new: "var(--signal-new)",
  risk: "var(--signal-risk)",
  wait: "var(--signal-wait)",
}

/** Escape text for a quoted Mermaid label that is rendered as HTML. */
export function escapeLabel(text: string): string {
  return text
    .replace(/&/g, "#amp;")
    .replace(/</g, "#lt;")
    .replace(/>/g, "#gt;")
    .replace(/"/g, "#quot;")
    .replace(/#(?![a-zA-Z]+;|\d+;)/g, "#35;")
    .replace(/[\r\n]+/g, " ")
}

/** Greedy wrap so a long edge label does not widen the drawing. */
export function wrapLabel(text: string, max = 18): string[] {
  const lines: string[] = []
  let line = ""
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > max) {
      lines.push(line)
      line = word
    } else line = line ? `${line} ${word}` : word
  }
  if (line) lines.push(line)
  return lines
}

export function mermaidNodeId(index: number): string {
  return `n${index}`
}

function nodeLabel(node: MapNodeSpec): string {
  const kind = node.kind ?? "service"
  const signal = node.signal ? ` mm-s-${node.signal}` : ""
  const sub = node.sub ? `<span class='mm-sub'>${escapeLabel(node.sub)}</span>` : ""
  return `<span class='mm-n mm-k-${kind}${signal}'><span class='mm-g'></span><span class='mm-t'>${escapeLabel(node.label)}</span>${sub}</span>`
}

const NODE_GAP = 40
const RANK_GAP = 36
/** Column width (px) a map should fit in before it scrolls sideways. */
export const MAP_FIT_WIDTH = 760

function textWidth(text: string, size: number): number {
  return text.length * size * 0.56
}

function nodeWidth(node: MapNodeSpec): number {
  return 28 + Math.max(textWidth(node.label, 18) * 1.05, node.sub ? textWidth(node.sub, 14) : 0)
}

/** Longest-path rank per node, ignoring edges that would close a cycle. */
export function rankOf(input: MapInput): Map<string, number> {
  const rank = new Map(input.nodes.map((n) => [n.id, 0]))
  for (let pass = 0; pass < input.nodes.length; pass++) {
    let changed = false
    for (const e of input.edges) {
      if (e.from === e.to || !rank.has(e.from) || !rank.has(e.to)) continue
      const next = rank.get(e.from)! + 1
      if (next > rank.get(e.to)! && next < input.nodes.length) {
        rank.set(e.to, next)
        changed = true
      }
    }
    if (!changed) break
  }
  return rank
}

/** Estimated drawing width for a direction. Only used to choose between the two. */
export function estimateWidth(input: MapInput, direction: MapDirection): number {
  const rank = rankOf(input)
  const ranks = new Map<number, MapNodeSpec[]>()
  for (const n of input.nodes) ranks.set(rank.get(n.id)!, [...(ranks.get(rank.get(n.id)!) ?? []), n])
  if (direction === "TB") {
    return Math.max(...[...ranks.values()].map((r) => r.reduce((w, n) => w + nodeWidth(n) + NODE_GAP, -NODE_GAP)))
  }
  let width = -RANK_GAP
  for (const [r, nodes] of [...ranks.entries()].sort((a, b) => a[0] - b[0])) {
    const labels = input.edges.filter((e) => rank.get(e.from) === r && e.label).map((e) => Math.max(...wrapLabel(e.label!).map((l) => textWidth(l, 14))) + 24)
    width += Math.max(...nodes.map(nodeWidth)) + RANK_GAP + (r < ranks.size - 1 ? Math.max(40, ...labels) : 0)
  }
  return width
}

/**
 * `row` is left to right, `column` top to bottom. `hub` (or no choice) takes whichever
 * direction fits the column, preferring left to right.
 */
export function pickDirection(input: MapInput): MapDirection {
  if (input.layout === "column") return "TB"
  const lr = estimateWidth(input, "LR")
  const fit = input.fitWidth ?? MAP_FIT_WIDTH
  if (input.layout === "row") return lr <= fit * 1.15 ? "LR" : estimateWidth(input, "TB") < lr ? "TB" : "LR"
  if (lr <= fit * 1.4) return "LR"
  return estimateWidth(input, "TB") < fit ? "TB" : "LR"
}

function arrow(edge: MapEdgeSpec, proposed: boolean): string {
  const dashed = proposed || edge.style === "dashed" || edge.mark === "removed"
  const bold = edge.style === "bold" && !dashed
  const both = !!edge.both
  if (dashed) return both ? "<-.->" : "-.->"
  if (bold) return both ? "<==>" : "==>"
  return both ? "<-->" : "-->"
}

/** Edge tone in the order Mermaid receives it. Colours are CSS variables, resolved in the page. */
export function edgeStroke(edge: MapEdgeSpec): { colour: string; dashed: boolean; proposed: boolean } {
  const proposed = edge.mark === "proposed" || edge.mark === "added"
  const colour = proposed
    ? "var(--signal-new)"
    : edge.mark === "removed"
      ? "var(--signal-risk)"
      : edge.mark === "changed"
        ? "var(--signal-wait)"
        : "var(--ink-muted)"
  return { colour, dashed: proposed || edge.style === "dashed" || edge.mark === "removed", proposed }
}

export function compileMap(input: MapInput): CompiledMap {
  const direction = pickDirection(input)
  const nodeIds = new Map<string, string>()
  input.nodes.forEach((node, i) => nodeIds.set(node.id, mermaidNodeId(i)))

  const lines: string[] = [`flowchart ${direction}`]
  // Declare nodes in the order they first appear along the edges, so Mermaid ranks them
  // in reading order and sibling edges do not swap places and cross.
  const order: MapNodeSpec[] = []
  const seen = new Set<string>()
  const push = (id: string) => {
    const node = input.nodes.find((n) => n.id === id)
    if (node && !seen.has(id)) {
      seen.add(id)
      order.push(node)
    }
  }
  for (const edge of input.edges) {
    push(edge.from)
    push(edge.to)
  }
  input.nodes.forEach((n) => push(n.id))
  for (const node of order) lines.push(`  ${nodeIds.get(node.id)}["${nodeLabel(node)}"]`)

  const edges: { index: number; from: string; to: string; spec: MapEdgeSpec; reversed: boolean }[] = []
  const back = backEdgeIndexes(input)
  input.edges.forEach((spec, index) => {
    const from = nodeIds.get(spec.from)
    const to = nodeIds.get(spec.to)
    if (!from || !to) return
    const { proposed } = edgeStroke(spec)
    const label = spec.label ? `|"${wrapLabel(spec.label).map(escapeLabel).join("<br/>")}"|` : ""
    // A cycle-closing edge is laid out forward (so ranks stay a clean chain) but drawn with
    // its arrowhead at the start: `to <--> from`, with the end arrowhead hidden in the DOM.
    const reversed = back.has(index) && !spec.both
    const op = reversed ? arrow({ ...spec, both: true }, proposed) : arrow(spec, proposed)
    lines.push(reversed ? `  ${to} ${op}${label} ${from}` : `  ${from} ${op}${label} ${to}`)
    edges.push({ index: edges.length, from, to, spec, reversed })
  })
  return { code: lines.join("\n"), direction, nodeIds, edges }
}

export function signalColour(signal: MapSignal): string {
  return SIGNAL_VAR[signal]
}
