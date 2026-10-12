import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import { ArtifactNodeSchema } from "@/lib/contract/artifact-schema"
import { CodeView } from "@/components/ui/code/code-view"
import { PullLine } from "./pull-line"
import { renderChapter } from "./chapter-adapter"
import { renderCompare } from "./compare-adapter"
import { renderEditorialTimeline } from "./timeline-adapter"
import { renderProse } from "../leaf-adapters"

const ctx = { data: {} } as never
const html = (el: unknown) => renderToStaticMarkup(el as never)

describe("wp4 round 2", () => {
  it("prose accepts size lead and renders deck-sized text", () => {
    const parsed = ArtifactNodeSchema.safeParse({ type: "prose", props: { content: "Hello", size: "lead" } })
    assert.equal(parsed.success, true)
    const out = html(renderProse({ node: { type: "prose", props: { content: "Hello there", size: "lead" } }, context: ctx } as never))
    assert.match(out, /text-deck/)
    const base = html(renderProse({ node: { type: "prose", props: { content: "Hello there" } }, context: ctx } as never))
    assert.doesNotMatch(base, /text-deck/)
  })

  it("compare verdict is a plain bold sentence, not a pull line", () => {
    const out = html(renderCompare({
      node: { type: "compare", props: { mode: "options", left: { label: "A", body: "a" }, right: { label: "B", body: "b" }, verdict: "B wins." } },
      context: ctx,
    } as never))
    assert.match(out, /data-verdict/)
    assert.match(out, /font-semibold/)
    assert.doesNotMatch(out, /italic|data-pull-line/)
  })

  it("PullLine uses the signal rule", () => {
    assert.match(html(<PullLine signal="risk">x</PullLine>), /border-signal-risk/)
    assert.match(html(<PullLine strong>x</PullLine>), /border-ink/)
  })

  it("timeline stacks when above the title on mobile", () => {
    const out = html(renderEditorialTimeline({
      node: { type: "timeline", props: { items: [{ when: "14 Sep", title: "T" }] } },
      context: ctx,
    } as never))
    assert.match(out, /flex flex-col/)
    assert.doesNotMatch(out, /grid-cols-\[5rem/)
  })

  it("bare code block puts the title outside the surface", () => {
    const out = html(<CodeView title="Boot" code="ls" language="bash" />)
    assert.match(out, /data-code-mode="code"/)
    assert.doesNotMatch(out, /border-b bg-muted/)
  })
})

describe("wp4 round 3 chapter emphasis", () => {
  const chapter = (props: object) =>
    html(renderChapter({ node: { type: "chapter", props: { title: "T", takeaway: "Take", ...props } }, context: ctx, nodePath: "nodes.0" } as never))
  it("schema accepts emphasis and rejects unknown values", () => {
    const ok = (e: string) => ArtifactNodeSchema.safeParse({ type: "chapter", props: { title: "T", emphasis: e } }).success
    assert.equal(ok("lead"), true)
    assert.equal(ok("quiet"), true)
    assert.equal(ok("loud"), false)
  })
  it("default takeaway is light, lead is strong, quiet is compact", () => {
    assert.doesNotMatch(chapter({}), /data-strong/)
    assert.match(chapter({ emphasis: "lead" }), /data-strong/)
    const quiet = chapter({ emphasis: "quiet" })
    assert.match(quiet, /text-\[1\.625rem\]/)
    assert.match(quiet, /data-emphasis="quiet"/)
  })
})
