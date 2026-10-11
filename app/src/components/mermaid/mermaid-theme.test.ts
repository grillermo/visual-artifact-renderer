import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { svgNaturalSize } from "./mermaid-theme"

describe("svgNaturalSize", () => {
  it("reads the viewBox", () => assert.deepEqual(svgNaturalSize('<svg viewBox="0 -5 320.5 140">'), { width: 320.5, height: 140 }))
  it("returns null without one", () => assert.equal(svgNaturalSize("<svg>"), null))
})
