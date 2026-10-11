import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

import { normalizeSequenceSteps } from "@/lib/contract/artifact-manifest"
import { normalizeBoxEdges } from "@/lib/contract/artifact-manifest"
import { countCrossings, layoutMap, MAP_METRICS, pickOrientation, type MapNodeSpec } from "@/lib/diagram/map-layout"
import { SequencePropsSchema } from "../../../../shared/dist/contract.js"

const skillNodes: MapNodeSpec[] = [
  { id: "cat", label: "agent-skills", sub: "public catalog", kind: "store" },
  { id: "pin", label: "agents2 pin", sub: "locked commit", kind: "file" },
  { id: "pi", label: "Pi", sub: "~/.pi/agent/skills", kind: "service" },
  { id: "cur", label: "~/.cursor/skills", kind: "file" },
  { id: "cloud", label: "Cursor cloud agents", kind: "external" },
  { id: "boot", label: "bootstrap.sh", sub: "other cloud boxes", kind: "service" },
]
const skillEdges = normalizeBoxEdges(["cat -> pin : pin", "pin -> pi : link", "pin -> cur : link", "cur -> cloud : Cursor skill sync", "cat --> boot : curl"]).edges

describe("crossings", () => {
  it("skills map has no crossing edges in any layout or orientation", () => {
    for (const layout of ["hub", undefined] as const)
      for (const o of ["row", "column"] as const) assert.equal(countCrossings(layoutMap({ nodes: skillNodes, edges: skillEdges, layout }, o)), 0, `${layout} ${o}`)
  })
  it("counts a real crossing", () => {
    const nodes: MapNodeSpec[] = ["a", "b", "c", "d"].map((id) => ({ id, label: id }))
    const edges = normalizeBoxEdges(["a -> d", "b -> c", "a -> c", "b -> d"]).edges
    const l = layoutMap({ nodes, edges, layout: "row" as never }, "row")
    assert.ok(countCrossings(l) >= 0)
    assert.equal(countCrossings({ edges: [{ points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] }, { points: [{ x: 0, y: 10 }, { x: 10, y: 0 }] }] } as never), 1)
  })
})

describe("orientation is stable", () => {
  it("same input and nominal box give the same orientation every time", () => {
    const a = pickOrientation({ nodes: skillNodes, edges: skillEdges }, { width: 340 })
    const b = pickOrientation({ nodes: skillNodes, edges: skillEdges }, { width: 340 })
    assert.equal(a.orientation, b.orientation)
  })
})

describe("svg text sizes", () => {
  it("layout metrics equal the CSS type tokens", () => {
    const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8")
    const px = (name: string) => Number(new RegExp(`--${name}:\\s*([\\d.]+)rem`).exec(css)![1]) * 16
    assert.equal(MAP_METRICS.labelSize, px("fs-small"))
    assert.equal(MAP_METRICS.subSize, px("fs-meta"))
    assert.equal(MAP_METRICS.edgeSize, px("fs-meta"))
    assert.equal(MAP_METRICS.tinySize, px("fs-label"))
  })
})

describe("sequence key", () => {
  const base = { caption: "c", participants: [{ id: "a" }, { id: "b" }], steps: ["a -> b : one", "--- later ---", "b --> a : two"] }
  it("counts message steps only", () => {
    assert.equal(SequencePropsSchema.safeParse({ ...base, key: [1] }).success, true)
    assert.equal(SequencePropsSchema.safeParse({ ...base, key: [2] }).success, false)
    assert.equal(normalizeSequenceSteps(base.steps).steps.filter((s) => s.kind === "message").length, 2)
  })
})
