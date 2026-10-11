import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { normalizeBoxEdges } from "@/lib/contract/artifact-manifest"
import { countCrossings, focusCrop, layoutMap, layoutNarrow, NARROW_MAX_RENDER_WIDTH, type MapNodeSpec } from "@/lib/diagram/map-layout"
import { activeBeat } from "@/components/adapters/editorial/story-adapter"

const nodes: MapNodeSpec[] = [
  { id: "cat", label: "agent-skills", sub: "public catalog", kind: "store" },
  { id: "pin", label: "agents2 pin", sub: "locked commit", kind: "file" },
  { id: "pi", label: "Pi", sub: "~/.pi/agent/skills", kind: "service" },
  { id: "cur", label: "~/.cursor/skills", kind: "file" },
  { id: "cloud", label: "Cursor cloud agents", kind: "external" },
  { id: "boot", label: "bootstrap.sh", sub: "other cloud boxes", kind: "service" },
]
const edges = normalizeBoxEdges(["cat -> pin : pin", "pin -> pi : link", "pin -> cur : link", "cur -> cloud : Cursor skill sync", "cat --> boot : curl"]).edges

describe("narrow layout", () => {
  it("fits a phone at natural size with no crossings", () => {
    const l = layoutNarrow({ nodes, edges, layout: "hub" })
    assert.ok(l.width <= NARROW_MAX_RENDER_WIDTH, `width ${l.width}`)
    assert.equal(countCrossings(l), 0)
    assert.equal(l.orientation, "column")
  })
  it("hub with a non-star shape prefers the layered layout", () => {
    assert.equal(layoutMap({ nodes, edges, layout: "hub" }, "row").nodes.length, 6)
  })
})

describe("story active beat", () => {
  it("is beat 0 before the story enters", () => assert.equal(activeBeat([900, 1400, 1900, 2400], 800), 0))
  it("follows scroll", () => {
    assert.equal(activeBeat([-1500, -900, 100, 700], 800), 2)
    assert.equal(activeBeat([-3000, -2500, -2000, -300], 800), 3)
  })
})

describe("focusCrop", () => {
  it("clamps to the drawing and centres on the nodes", () => {
    const l = layoutNarrow({ nodes, edges })
    const c = focusCrop(l, new Set(["cloud"]), 200, 150)
    assert.ok(c.x >= 0 && c.y >= 0 && c.x + c.w <= l.width && c.y + c.h <= l.height)
    const n = l.nodes.find((x) => x.id === "cloud")!.rect
    assert.ok(n.y >= c.y && n.y + n.h <= c.y + c.h)
  })
})
