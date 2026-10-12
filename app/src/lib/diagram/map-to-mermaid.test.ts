import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { normalizeBoxEdges } from "@/lib/contract/artifact-manifest"
import { backEdgeIndexes, compileMap, escapeLabel, pickDirection, wrapLabel, type MapNodeSpec } from "@/lib/diagram/map-to-mermaid"

const nodes: MapNodeSpec[] = [
  { id: "a", label: "Alpha", sub: "first", kind: "store", signal: "new" },
  { id: "b", label: "Beta", kind: "actor" },
  { id: "c", label: "Gamma" },
]
const edges = (lines: string[]) => normalizeBoxEdges(lines).edges

describe("compileMap", () => {
  it("emits one node and one edge per spec, in a flowchart", () => {
    const out = compileMap({ nodes, edges: edges(["a -> b : go", "b --> c", "+ a -> c"]) })
    assert.match(out.code, /^flowchart (LR|TB)\n/)
    assert.equal(out.code.match(/^ {2}n\d\["/gm)?.length, 3)
    assert.match(out.code, /n0 -->\|"go"\| n1/)
    assert.match(out.code, /n1 -\.-> n2/)
    assert.match(out.code, /n0 -\.-> n2/)
    assert.match(out.code, /mm-s-new/)
    assert.match(out.code, /mm-k-store/)
  })

  it("escapes user text so it cannot inject HTML or Mermaid syntax", () => {
    const evil: MapNodeSpec[] = [
      { id: "a", label: `<img src=x onerror="x">`, sub: `"]; click a call()` },
      { id: "b", label: "B & C" },
    ]
    const out = compileMap({ nodes: evil, edges: edges(["a -> b : <b>hi</b>"]) })
    assert.ok(!out.code.includes("<img"))
    assert.ok(!out.code.includes("<b>"))
    assert.ok(!/"\]; click/.test(out.code))
    assert.equal(escapeLabel('a<b>"&'), "a#lt;b#gt;#quot;#amp;")
  })

  it("keeps edge order stable and reverses cycle-closing edges", () => {
    const list = edges(["a -> b", "b -> c", "c -> a : back"])
    assert.deepEqual([...backEdgeIndexes({ nodes, edges: list })], [2])
    const out = compileMap({ nodes, edges: list })
    assert.deepEqual(out.edges.map((e) => e.reversed), [false, false, true])
    assert.match(out.code, /n0 <-->\|"back"\| n2/)
  })

  it("maps node ids to stable mermaid ids", () => {
    const out = compileMap({ nodes, edges: [] })
    assert.equal(out.nodeIds.get("c"), "n2")
  })
})

describe("direction", () => {
  it("honours column and picks LR for a short row", () => {
    assert.equal(pickDirection({ nodes, edges: edges(["a -> b"]), layout: "column" }), "TB")
    assert.equal(pickDirection({ nodes, edges: edges(["a -> b", "b -> c"]), layout: "row" }), "LR")
  })
  it("falls back to TB when a long chain does not fit", () => {
    const many: MapNodeSpec[] = ["one", "two", "three", "four", "five", "six"].map((id) => ({ id, label: `${id} step label`, sub: "with a sub label" }))
    const chain = edges(["one -> two : x", "two -> three : y", "three -> four : z", "four -> five : w", "five -> six : v"])
    assert.equal(pickDirection({ nodes: many, edges: chain, layout: "row", fitWidth: 420 }), "TB")
  })
})

describe("wrapLabel", () => {
  it("wraps at word boundaries", () => {
    assert.deepEqual(wrapLabel("too large, use session model", 18), ["too large, use", "session model"])
  })
})
