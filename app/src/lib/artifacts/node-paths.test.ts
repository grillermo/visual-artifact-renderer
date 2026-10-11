import { describe, it } from "node:test"
import assert from "node:assert/strict"

import { VisualArtifactSpecSchema } from "@/lib/contract/artifact-schema"
import { resolveNodePath } from "@/lib/artifacts/node-paths"

const specFixture = VisualArtifactSpecSchema.parse({
  slug: "anchor-test", title: "Anchor test", nodes: [
    { type: "prose", props: { content: "Top level 0" }, metadata: { id: "root-0" } },
    { type: "chapter", props: { title: "Chapter" }, children: [
      { type: "columns", children: [
        { type: "prose", props: { content: "Child 0" } },
        { type: "prose", props: { content: "Child 1" } },
      ] },
      { type: "details", props: { summary: "More" }, children: [{ type: "prose", props: { content: "Nested child 0" } }] },
    ] },
  ],
})

describe("resolveNodePath", () => {
  it("resolves top-level nodes", () => {
    const node = resolveNodePath(specFixture, "nodes.0")
    assert.equal(node?.type, "prose")
    assert.equal(node.props.content, "Top level 0")
    assert.equal(node.metadata?.id, "root-0")
  })
  it("resolves chapter, columns and details children", () => {
    for (const [path, content] of [["nodes.1.children.0.children.0", "Child 0"], ["nodes.1.children.1.children.0", "Nested child 0"]]) {
      const node = resolveNodePath(specFixture, path)
      assert.equal(node?.type, "prose")
      assert.equal(node.props.content, content)
    }
  })
  it("returns undefined for unknown paths", () => {
    for (const path of ["nodes.99", "nodes.1.children.99", "nodes.1.children.0.children.99", "nodes.1.props.items.0.nodes.0"]) {
      assert.equal(resolveNodePath(specFixture, path), undefined)
    }
  })
})

describe("metadata schema", () => {
  it("accepts nodes without metadata", () => {
    assert.equal(VisualArtifactSpecSchema.safeParse({ slug: "no-metadata", title: "No metadata", nodes: [{ type: "prose", props: { content: "Hello" } }] }).success, true)
  })
  it("rejects empty metadata id", () => {
    assert.equal(VisualArtifactSpecSchema.safeParse({ slug: "empty-id", title: "Empty id", nodes: [{ type: "prose", props: { content: "Hello" }, metadata: { id: "" } }] }).success, false)
  })
})
