import { describe, it } from "node:test"
import { strict as assert } from "node:assert"

import {
  ARTIFACT_NODE_TYPES,
  LEGACY_NODE_TYPES,
  artifactComponentManifest,
  createArtifactContract,
  findLegacyNodeWarnings,
  safeParseVisualArtifactSpec,
  ArtifactNodeSchema,
} from "./artifact-manifest"

function spec(nodes: unknown[], data?: Record<string, unknown>) {
  return { slug: "t", title: "T", nodes, ...(data ? { data } : {}) }
}

const mapNode = (count: number, edges: string[] = []) => ({
  type: "map",
  props: {
    caption: "A map.",
    nodes: Array.from({ length: count }, (_, i) => ({ id: `n${i}`, label: `Node ${i}` })),
    edges,
  },
})

function messages(result: ReturnType<typeof safeParseVisualArtifactSpec>) {
  return result.success ? "" : result.error.issues.map((issue) => issue.message).join("\n")
}

describe("map limits", () => {
  it("accepts 6 nodes and 8 edges", () => {
    const edges = ["n0 -> n1", "n1 -> n2", "n2 -> n3", "n3 -> n4", "n4 -> n5", "n0 -> n5", "n0 -> n2", "n1 -> n3"]
    assert.equal(safeParseVisualArtifactSpec(spec([mapNode(6, edges)])).success, true)
  })

  it("rejects 7 nodes with the split message", () => {
    const result = safeParseVisualArtifactSpec(spec([mapNode(7)]))
    assert.equal(result.success, false)
    assert.match(messages(result), /Split into two maps or use steps\./)
  })

  it("rejects 9 edges and unknown edge ends", () => {
    const nine = Array.from({ length: 9 }, () => "n0 -> n1")
    assert.match(messages(safeParseVisualArtifactSpec(spec([mapNode(3, nine)]))), /Split into two maps or use steps\./)
    assert.match(messages(safeParseVisualArtifactSpec(spec([mapNode(2, ["n0 -> ghost"])]))), /unknown node "ghost"/)
  })
})

describe("other hard limits", () => {
  it("rejects 8 steps, 5 figures and a columns child that is a diagram", () => {
    const steps = { type: "steps", props: { items: Array.from({ length: 8 }, (_, i) => ({ title: `S${i}` })) } }
    assert.equal(safeParseVisualArtifactSpec(spec([steps])).success, false)
    const figures = { type: "figures", props: { items: Array.from({ length: 5 }, (_, i) => ({ value: i, label: "x" })) } }
    assert.equal(safeParseVisualArtifactSpec(spec([figures])).success, false)
    const columns = { type: "columns", children: [mapNode(2), { type: "prose", props: { content: "x" } }] }
    assert.match(messages(safeParseVisualArtifactSpec(spec([columns]))), /columns holds text only/)
  })

  it("rejects 11 sequence steps but accepts 10", () => {
    const seq = (n: number) => ({
      type: "sequence",
      props: { caption: "c", participants: [{ id: "a" }, { id: "b" }], steps: Array.from({ length: n }, () => "a -> b : go") },
    })
    assert.equal(safeParseVisualArtifactSpec(spec([seq(10)])).success, true)
    assert.equal(safeParseVisualArtifactSpec(spec([seq(11)])).success, false)
  })
})

describe("legacy and aliases", () => {
  it("still parses legacy node types", () => {
    const result = safeParseVisualArtifactSpec(
      spec(
        [
          { type: "section", props: { title: "S" }, children: [{ type: "text", props: { text: "hi" } }] },
          { type: "stat-card", props: { label: "L", value: 1 } },
          { type: "status-grid", props: { dataKey: "d", statusKey: "s" } },
          { type: "flow", props: { items: [{ title: "a" }, { title: "b" }] } },
        ],
        { d: [{ s: "ok" }] },
      ),
    )
    assert.equal(result.success, true, messages(result))
  })

  it("parses the old table and timeline props", () => {
    const result = safeParseVisualArtifactSpec(
      spec(
        [
          { type: "table", props: { dataKey: "d", columns: ["a", { key: "b", label: "B" }], caption: "c" } },
          { type: "timeline", props: { dataKey: "d", titleKey: "a", markerKey: "b", descriptionKey: "a", statusKey: "b" } },
        ],
        { d: [{ a: 1, b: 2 }] },
      ),
    )
    assert.equal(result.success, true, messages(result))
  })

  it("accepts the new table props and the literal timeline", () => {
    const result = safeParseVisualArtifactSpec(
      spec(
        [
          { type: "table", props: { dataKey: "d", dense: true, statusKey: "a", highlightKey: "b", onlyDiffs: true } },
          { type: "timeline", props: { items: [{ when: "Mon", title: "A" }, { when: "Tue", title: "B", signal: "new" }] } },
        ],
        { d: [{ a: 1, b: true }] },
      ),
    )
    assert.equal(result.success, true, messages(result))
  })

  it("parses code and sequence aliases with the same props as the old names", () => {
    const code = { title: "T", language: "bash", code: "ls" }
    const seq = { caption: "c", participants: [{ id: "a" }, { id: "b" }], steps: ["a -> b : x"] }
    const result = safeParseVisualArtifactSpec(
      spec([
        { type: "code", props: code },
        { type: "code-block", props: code },
        { type: "sequence", props: seq },
        { type: "sequence-diagram", props: seq },
      ]),
    )
    assert.equal(result.success, true, messages(result))
  })

  it("warns on legacy types once each, recursing into children and tabs", () => {
    const warnings = findLegacyNodeWarnings([
      { type: "grid", children: [{ type: "stat-card" }, { type: "stat-card" }] },
      { type: "tabs", props: { items: [{ nodes: [{ type: "badge" }] }] } },
      { type: "ledger" },
    ])
    assert.equal(warnings.length, 4)
    assert.match(warnings.join("\n"), /grid is legacy; use columns/)
    assert.match(warnings.join("\n"), /stat-card is legacy; use figures/)
    assert.match(warnings.join("\n"), /badge is legacy/)
  })
})

describe("ledger", () => {
  it("accepts the literal and the data-backed variants", () => {
    const literal = {
      type: "ledger",
      props: { groups: [{ label: "Can break", signal: "risk", rows: [{ title: "A", body: "b", next: "n" }] }] },
    }
    const dataBacked = {
      type: "ledger",
      props: {
        dataKey: "loops",
        titleKey: "title",
        bodyKey: "body",
        groupKey: "kind",
        groupOrder: ["Can break something", "Waiting on you"],
        signals: { "Can break something": "risk", "Waiting on you": "wait" },
      },
    }
    const result = safeParseVisualArtifactSpec(
      spec([literal, dataBacked], { loops: [{ title: "A", body: "b", kind: "Waiting on you" }] }),
    )
    assert.equal(result.success, true, messages(result))
  })

  it("rejects 5 groups, a pill-style unknown prop, and a data variant missing groupKey", () => {
    const group = { label: "G", rows: [{ title: "A", body: "b" }] }
    assert.equal(safeParseVisualArtifactSpec(spec([{ type: "ledger", props: { groups: Array(5).fill(group) } }])).success, false)
    assert.equal(
      safeParseVisualArtifactSpec(spec([{ type: "ledger", props: { groups: [{ ...group, pill: true }] } }])).success,
      false,
    )
    assert.equal(
      safeParseVisualArtifactSpec(
        spec([{ type: "ledger", props: { dataKey: "d", titleKey: "a", bodyKey: "b" } }], { d: [{ a: 1 }] }),
      ).success,
      false,
    )
  })
})

describe("story", () => {
  it("accepts 8 diagram nodes and rejects beats that show unknown nodes", () => {
    const diagram = (n: number) => ({
      nodes: Array.from({ length: n }, (_, i) => ({ id: `n${i}`, label: `N${i}` })),
      edges: ["n0 -> n1"],
    })
    const story = (n: number, show: string[]) => ({
      type: "story",
      props: { caption: "c", diagram: diagram(n), beats: [{ text: "a", show: ["n0"] }, { text: "b", show }] },
    })
    assert.equal(safeParseVisualArtifactSpec(spec([story(8, ["n0", "n1"])])).success, true)
    assert.equal(safeParseVisualArtifactSpec(spec([story(9, ["n0"])])).success, false)
    assert.match(messages(safeParseVisualArtifactSpec(spec([story(3, ["ghost"])]))), /unknown node "ghost"/)
  })
})

describe("contract", () => {
  const contract = createArtifactContract()

  it("is version 2.0.0 with the core and specialised nodes only", () => {
    assert.equal(contract.version, "2.0.0")
    assert.deepEqual([...contract.nodeTypes].sort(), [...ARTIFACT_NODE_TYPES].sort())
    for (const legacy of LEGACY_NODE_TYPES) {
      assert.equal(contract.nodes[legacy], undefined, legacy)
      assert.ok(contract.legacy[legacy], `${legacy} hint`)
      assert.ok(!contract.nodeTypes.includes(legacy))
    }
    for (const core of ["chapter", "ledger", "map", "story", "steps", "compare"]) assert.ok(contract.nodes[core], core)
  })

  it("keeps legacy out of pattern examples and uses the new nodes", () => {
    const legacy = new Set<string>(LEGACY_NODE_TYPES)
    const walk = (nodes: { type: string; children?: unknown[] }[]) => {
      for (const node of nodes) {
        assert.ok(!legacy.has(node.type), `pattern uses legacy ${node.type}`)
        walk((node.children ?? []) as { type: string; children?: unknown[] }[])
      }
    }
    assert.deepEqual(Object.keys(contract.patternExamples).sort(), ["decision", "explainer", "plan", "status-board", "weekly-report"])
    for (const pattern of Object.values(contract.patternExamples)) walk(pattern.nodes as never)
  })

  it("every pattern example parses as a spec", () => {
    for (const [name, pattern] of Object.entries(contract.patternExamples)) {
      const result = safeParseVisualArtifactSpec(spec(pattern.nodes))
      assert.equal(result.success, true, `${name}: ${messages(result)}`)
    }
  })

  it("every manifest example parses and legacy entries point at advertised types", () => {
    for (const entry of artifactComponentManifest) {
      const result = ArtifactNodeSchema.safeParse(entry.example)
      assert.equal(result.success, true, `${entry.type}: ${result.success ? "" : result.error.message}`)
      if (entry.legacy) assert.ok((ARTIFACT_NODE_TYPES as readonly string[]).includes(entry.legacy.replacedBy), entry.type)
    }
  })
})
