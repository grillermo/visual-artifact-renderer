import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import { chapterId, collectChapters } from "@/lib/artifacts/chapter-ids"
import type { ArtifactNode } from "@/lib/contract/artifact-schema"
import { ContentsDisclosure, RailLayout } from "./page-rail"
import { ChapterRegistryProvider } from "./scroll-active-provider"

const chapter = (title: string, children?: ArtifactNode[]) =>
  ({ type: "chapter", props: { title }, ...(children ? { children } : {}) }) as unknown as ArtifactNode
const prose = { type: "prose", props: { content: "x" } } as unknown as ArtifactNode

function render(nodes: ArtifactNode[]) {
  return renderToStaticMarkup(
    <ChapterRegistryProvider initialChapters={collectChapters(nodes)}>
      <RailLayout>
        <ContentsDisclosure />
        <p>body</p>
      </RailLayout>
    </ChapterRegistryProvider>
  )
}

describe("collectChapters", () => {
  it("walks nested nodes in document order with renderer node paths", () => {
    const nodes = [chapter("Memory"), prose, { type: "section", props: { title: "Old" }, children: [chapter("Agents")] } as unknown as ArtifactNode]
    assert.deepEqual(collectChapters(nodes), [
      { id: chapterId("Memory", "nodes.0"), title: "Memory" },
      { id: chapterId("Agents", "nodes.2.children.0"), title: "Agents" },
    ])
    assert.equal(chapterId("Memory", "nodes.0"), "chapter-memory-nodes-0")
  })
})

describe("RailLayout server render", () => {
  it("includes the rail, contents disclosure and chapter links with 3 chapters", () => {
    const html = render([chapter("Memory"), chapter("Agents"), chapter("Skills")])
    assert.match(html, /data-slot="page-rail"/)
    assert.match(html, /data-slot="page-rail-mobile"/)
    assert.match(html, /grid-cols-\[180px_minmax\(0,1fr\)\]/)
    // One disclosure only, with a 44px summary.
    assert.equal(html.match(/data-slot="page-rail-mobile"/g)?.length, 1)
    assert.match(html, /<summary class="[^"]*min-h-11/)
    for (const [i, t] of ["Memory", "Agents", "Skills"].entries()) {
      assert.ok(html.includes(`href="#${chapterId(t, `nodes.${i}`)}"`), `link to ${t}`)
    }
  })

  it("omits the rail under 3 chapters", () => {
    const html = render([chapter("Memory"), chapter("Agents")])
    assert.doesNotMatch(html, /page-rail/)
    assert.doesNotMatch(html, /grid-cols-\[180px/)
  })
})
