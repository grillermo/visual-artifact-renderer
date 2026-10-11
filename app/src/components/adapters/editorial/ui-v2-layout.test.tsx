import assert from "node:assert/strict"
import { it } from "node:test"
import { readFileSync } from "node:fs"
import { renderToStaticMarkup } from "react-dom/server"
import { renderFigures } from "./figures-adapter"
import { MapConnectionList, cropToContent } from "@/components/mermaid/map-mermaid"
import { renderClaim } from "../plan/claim-tree-adapter"
import type { AdapterArgs } from "@/components/artifact-types"

it("figures wrap before values collide and keep labels at word boundaries", () => {
  const args: AdapterArgs<"figures"> = {
    node: { type: "figures", props: { items: [{ value: "13,107 tokens", label: "Output allowance", trend: [1, 2, 3] }, { value: "±20%", label: "Estimator uncertainty" }] } },
    context: { project: "p", slug: "s", data: undefined }, nodePath: "nodes.0", renderNodes: () => null,
  }
  const out = renderToStaticMarkup(renderFigures(args))
  assert.match(out, /flex-wrap/)
  assert.doesNotMatch(out, /grid-cols-2/)
  assert.match(out, /13,107 tokens/)
  assert.match(out, /<dt class="[^"]*text-small/)
  assert.doesNotMatch(out, /<dt class="[^"]*break-words/)
})

it("narrow map list retains node labels, edges and proposed states", () => {
  const out = renderToStaticMarkup(<MapConnectionList input={{
    nodes: [{ id: "tool", label: "Any tool call" }, { id: "res", label: "Tidy resolver", sub: "calls next() for every tool", signal: "new" }],
    edges: [{ from: "tool", to: "res", label: "render", mark: "proposed" }],
  }} />)
  assert.match(out, /Map connections/)
  assert.match(out, /Any tool call/)
  assert.match(out, /Tidy resolver: render/)
  assert.match(out, /proposed/)
  assert.match(out, /calls next\(\) for every tool/)
})

it("map crop includes HTML labels outside the SVG group bounds", () => {
  const attributes = new Map<string, string>()
  const svg = {
    querySelector: () => ({ getBBox: () => ({ x: 0, y: 0, width: 100, height: 60 }) }),
    querySelectorAll: () => [{ getBoundingClientRect: () => ({ left: -5, top: -4, right: 120, bottom: 90 }) }],
    getScreenCTM: () => ({ inverse: () => ({}) }),
    createSVGPoint: () => ({ x: 0, y: 0, matrixTransform() { return { x: this.x, y: this.y } } }),
    setAttribute: (key: string, value: string) => attributes.set(key, value), style: {}, dataset: {},
  }
  cropToContent(svg as unknown as SVGSVGElement)
  assert.equal(attributes.get("viewBox"), "-17 -16 149 118")
})

it("plain claims no longer expose a claim-specific comment action", () => {
  const out = renderToStaticMarkup(renderClaim({
    node: { type: "claim", props: { text: "Keep source readable" } }, context: { project: "p", slug: "s", data: undefined }, nodePath: "nodes.0", renderNodes: () => null,
  }))
  assert.match(out, /Keep source readable/)
  assert.doesNotMatch(out, /Comment on claim/)
})

it("trace layouts and narrow maps respond to their own widths", () => {
  const css = readFileSync(new URL("../../../app/globals.css", import.meta.url), "utf8")
  assert.match(css, /--va-content-max-width: 96rem/)
  assert.match(css, /@container va-trace \(min-width: 60rem\)/)
  assert.match(css, /@container va-map \(max-width: 44rem\)/)
})
