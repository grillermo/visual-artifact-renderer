import { describe, it, before, after } from "node:test"
import { strict as assert } from "node:assert"
import { JSDOM } from "jsdom"
import { createRoot, type Root } from "react-dom/client"
import { act, type ReactNode } from "react"

import type { ArtifactRenderContext, RenderNodes } from "@/components/artifact-types"
import type { ArtifactNode } from "@/lib/contract/artifact-schema"

let container: HTMLDivElement
let root: Root

async function render(nodes: ArtifactNode[], data?: Record<string, unknown>) {
  const { componentRegistry } = await import("@/components/component-registry")
  const renderNodes: RenderNodes = (list, context, prefix = "nodes") =>
    list?.map((node, index) => {
      const Component = componentRegistry[node.type] as (args: unknown) => ReactNode
      const path = `${prefix}.${index}`
      const children = "children" in node && node.children ? renderNodes(node.children, context, `${path}.children`) : undefined
      return <div key={path}>{Component({ node, context, children, renderNodes, nodePath: path })}</div>
    })
  const context = { project: "p", slug: "t", data } as ArtifactRenderContext
  await act(async () => {
    root.render(<>{renderNodes(nodes, context)}</>)
  })
}

const node = (type: string, props: unknown) => ({ type, props }) as ArtifactNode

describe("row adapters (DOM)", () => {
  before(() => {
    const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, { url: "http://localhost:9412/p/t/" })
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    global.window = dom.window as unknown as Window & typeof globalThis
    global.document = dom.window.document
    Object.defineProperty(global, "navigator", { value: dom.window.navigator, configurable: true, writable: true })
    for (const key of ["HTMLElement", "Node", "MutationObserver", "getComputedStyle", "KeyboardEvent", "Event", "SVGElement"] as const) {
      ;(globalThis as Record<string, unknown>)[key] = (dom.window as unknown as Record<string, unknown>)[key]
    }
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }) as unknown as MediaQueryList
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })
  after(() => act(() => root.unmount()))

  const ledger = node("ledger", {
    groups: [
      { label: "Can break something", signal: "risk", hint: "Fix these first.", rows: [{ title: "Herdr ui.accent", body: "Remove it.", next: "Re-run apply." }] },
      { label: "Waiting on you", signal: "wait", rows: [{ title: "Work Mac", body: "Not checked." }, { title: "Stops", body: "x" }] },
    ],
  })

  it("ledger renders groups in author order with a title column of at least 10ch", async () => {
    await render([ledger])
    const labels = [...container.querySelectorAll("[data-ledger-group] h3")].map((h) => h.textContent)
    assert.deepEqual(labels, ["Can break something", "Waiting on you"])
    const row = container.querySelector("[data-ledger-row]")!
    assert.match(row.className, /minmax\(10ch,/)
    assert.equal(container.querySelectorAll("[data-ledger-row]").length, 3)
  })

  it("ledger has no pills, no side borders and no break-all", async () => {
    await render([ledger])
    const html = container.innerHTML
    assert.ok(!/break-all/.test(html), "break-all found")
    assert.ok(!/rounded-full|rounded-md|rounded-lg|\bborder-l/.test(html), "pill or side border found")
    assert.ok(!/<(span|div)[^>]*(Badge|badge)/.test(html))
    for (const row of container.querySelectorAll("[data-ledger-row]")) {
      assert.ok(!/\bborder\b(?!-)/.test(row.className), "row has a full border")
    }
  })

  it("data-backed ledger groups rows by groupKey in groupOrder", async () => {
    await render(
      [node("ledger", { dataKey: "loops", titleKey: "item", bodyKey: "notes", groupKey: "status", groupOrder: ["risk", "wait"], signals: { risk: "risk", wait: "wait" } })],
      { loops: [{ item: "A", notes: "a", status: "wait" }, { item: "B", notes: "b", status: "risk" }] },
    )
    const groups = [...container.querySelectorAll("[data-ledger-group]")]
    assert.deepEqual(groups.map((g) => g.getAttribute("data-signal")), ["risk", "wait"])
  })

  it("table stays bare and retains hover transitions with reduced-motion support", async () => {
    const data = { t: [{ name: "a", v: "1" }, { name: "b", v: "2" }] }
    await render([node("table", { dataKey: "t" })], data)
    assert.ok(container.querySelector("[data-table]"))
    const row = container.querySelector("tbody tr")!
    assert.match(row.className, /transition-colors/)
    assert.match(row.className, /hover:bg-muted\/55/)
    assert.match(row.className, /motion-reduce:transition-none/)
  })

  it("checklist labels every state for screen readers", async () => {
    await render([node("checklist", { items: [{ text: "a", state: "done" }, { text: "b", state: "blocked" }, { text: "c", state: "dropped" }] })])
    const labels = [...container.querySelectorAll("[role=img]")].map((e) => e.getAttribute("aria-label"))
    assert.deepEqual(labels, ["Done", "Blocked", "Dropped"])
    assert.ok(container.querySelector("p.line-through"))
  })

  it("table hides uniform columns with onlyDiffs and has no outer border", async () => {
    await render(
      [node("table", { dataKey: "t", onlyDiffs: true })],
      { t: [{ name: "a", same: "FIXED", diff: "1" }, { name: "b", same: "FIXED", diff: "2" }] },
    )
    const heads = [...container.querySelectorAll("th")].map((th) => th.textContent)
    assert.deepEqual(heads, ["Name", "Diff"])
    assert.ok(!/break-all/.test(container.innerHTML))
    assert.ok(!/\brounded|\bborder\b(?!-)/.test(container.querySelector("[data-table]")!.innerHTML))
  })

  it("data-backed ledger clamps to 12 rows and 4 groups with an 'and N more' line", async () => {
    const rows = Array.from({ length: 15 }, (_, i) => ({ t: `r${i}`, b: "b", g: "g1" }))
    const extra = ["g2", "g3", "g4", "g5"].map((g) => ({ t: g, b: "b", g }))
    await render([node("ledger", { dataKey: "d", titleKey: "t", bodyKey: "b", groupKey: "g" })], { d: [...rows, ...extra] })
    assert.equal(container.querySelectorAll("[data-ledger-group]").length, 4)
    assert.equal(container.querySelectorAll("[data-ledger-group]:first-child [data-ledger-row]").length, 12)
    assert.match(container.textContent!, /and 3 more/)
  })

  it("figures put the label (dt) before the value (dd) in the DOM and use the figure token", async () => {
    await render([node("figures", { items: [{ value: 12, label: "Tools" }] })])
    const item = container.querySelector("dl > div")!
    assert.equal(item.children[0].tagName, "DT")
    assert.match(item.children[1].innerHTML, /text-figure/)
    assert.ok(!/text-\[/.test(container.innerHTML))
  })

  it("details chevron respects reduced motion", async () => {
    await render([node("details", { summary: "More" })])
    assert.match(container.querySelector("summary svg")!.getAttribute("class")!, /motion-reduce:transition-none/)
  })

  it("figures wrap with a minimum readable item width", async () => {
    await render([node("figures", { items: [{ value: 1, label: "A" }, { value: 2, label: "B" }, { value: 3, label: "C" }] })])
    const dl = container.querySelector("[data-figures]") as HTMLElement
    assert.match(dl.className, /flex-wrap/)
    assert.equal(dl.children.length, 3)
    assert.match(dl.children[0].className, /basis-\[var\(--va-figure-min-width\)\]/)
  })

  it("mobile table records use sentence-case inline labels and mark highlighted rows", async () => {
    await render([node("table", { dataKey: "t", highlightKey: "pick" })], { t: [{ name: "a", other: "x", pick: true }, { name: "b", other: "y", pick: false }] })
    const cards = container.querySelectorAll("article")
    assert.match(cards[0].className, /border-l-\[3px\]/)
    assert.ok(!/uppercase/.test(cards[0].innerHTML))
    assert.ok(!/border-l/.test(cards[1].className))
  })

  it("details summary has a 44px hit area and focus ring", async () => {
    await render([node("details", { summary: "More" })])
    assert.match(container.querySelector("summary")!.className, /min-h-11[\s\S]*focus-visible:outline-offset-\[3px\]/)
  })
})
