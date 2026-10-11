import { describe, it } from "node:test"
import { strict as assert } from "node:assert"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { normalizeBoxEdges } from "@/lib/contract/artifact-manifest"

import { inflate, placeEdgeLabel, polylineHitsRect, rectsOverlap, type Rect } from "./label-placement"
import { layoutMap, type MapLayout, type MapNodeSpec } from "./map-layout"

type Json = { type?: string; props?: Record<string, unknown>; children?: Json[] }

const WEEKLY = path.resolve(process.cwd(), "../ai-artifacts/node-redesign/store/agents2/agents2-week-2026-10-04/artifact.json")

function boxDiagrams(): Json[] {
  const spec = JSON.parse(readFileSync(WEEKLY, "utf8")) as { nodes: Json[] }
  const out: Json[] = []
  const walk = (n: Json) => {
    if (n.type === "box-diagram") out.push(n)
    n.children?.forEach(walk)
  }
  spec.nodes.forEach(walk)
  return out
}

function gridOf(rows: string[] | undefined) {
  return rows?.map((row) => row.split("|").slice(1, -1).map((c) => c.trim()).map((c) => (c === "." || c === "" ? null : c)))
}

function assertClean(layout: MapLayout, name: string) {
  const nodeRects = layout.nodes.map((n) => n.rect)
  for (const edge of layout.edges) {
    const p = edge.placement
    if (!p || p.kind !== "inline") continue
    for (const node of layout.nodes) {
      assert.ok(!rectsOverlap(p.rect, node.rect), `${name}: label "${edge.spec.label}" overlaps node ${node.id}`)
      assert.ok(!rectsOverlap(p.rect, inflate(node.rect, 5)), `${name}: label "${edge.spec.label}" is within 5px of node ${node.id}`)
    }
    layout.edges.forEach((other) => {
      const q = other.placement
      if (other === edge || !q || q.kind !== "inline") return
      assert.ok(!rectsOverlap(p.rect, q.rect), `${name}: labels "${edge.spec.label}" and "${other.spec.label}" overlap`)
    })
  }
  // Edge lines must not run through a third node either.
  for (const edge of layout.edges) {
    for (const node of nodeRects.filter((r) => r !== layout.nodes.find((n) => n.id === edge.spec.from)?.rect && r !== layout.nodes.find((n) => n.id === edge.spec.to)?.rect)) {
      assert.ok(!polylineHitsRect(edge.points, node), `${name}: edge ${edge.spec.from}->${edge.spec.to} crosses a node`)
    }
  }
}

describe("weekly report box diagrams", { skip: !existsSync(WEEKLY) }, () => {
  const diagrams = boxDiagrams()
  it("finds the three diagrams, one with nine edges", () => {
    assert.equal(diagrams.length, 3)
    assert.ok(diagrams.some((d) => (d.props!.edges as string[]).length === 9))
  })
  for (const orientation of ["row", "column"] as const) {
    diagrams.forEach((d, i) => {
      it(`${orientation} layout of diagram ${i + 1} has no label/node intersections`, () => {
        const p = d.props as { nodes: MapNodeSpec[]; edges: string[]; grid?: string[] }
        const layout = layoutMap({ nodes: p.nodes, edges: normalizeBoxEdges(p.edges).edges, grid: gridOf(p.grid) }, orientation)
        assert.equal(layout.nodes.length, p.nodes.length)
        assertClean(layout, `diagram ${i + 1} ${orientation}`)
        assert.equal(layout.markers.length, 0, "every label fits inline")
      })
    })
  }
})

describe("placeEdgeLabel", () => {
  const nodes: Rect[] = [
    { x: 0, y: 0, w: 60, h: 26 },
    { x: 300, y: 0, w: 60, h: 26 },
    { x: 150, y: -10, w: 60, h: 46 },
  ]
  const line = [{ x: 66, y: 13 }, { x: 294, y: 13 }]
  it("moves a label off a node that sits on the edge midpoint", () => {
    const p = placeEdgeLabel(line, "save durable facts", { nodes, labels: [] })
    assert.equal(p.kind, "inline")
    if (p.kind === "inline") for (const n of nodes) assert.ok(!rectsOverlap(p.rect, n))
  })
  it("falls back to a marker when nothing fits", () => {
    const wall: Rect[] = [{ x: -500, y: -500, w: 1500, h: 1000 }]
    assert.equal(placeEdgeLabel(line, "no room anywhere", { nodes: wall, labels: [] }).kind, "marker")
  })
  it("does not stack two labels", () => {
    const first = placeEdgeLabel(line, "same label", { nodes: [], labels: [] })
    assert.equal(first.kind, "inline")
    if (first.kind !== "inline") return
    const second = placeEdgeLabel(line, "same label", { nodes: [], labels: [first.rect] })
    assert.equal(second.kind, "inline")
    if (second.kind === "inline") assert.ok(!rectsOverlap(first.rect, second.rect))
  })
})
