import { it } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { PanelShell } from "./panel-shell"

it("keeps the closed panel inert and exposes the open panel", () => {
  const closed = renderToStaticMarkup(<PanelShell open={false} ariaLabel="Comments">Feedback</PanelShell>)
  assert.match(closed, /aria-hidden="true"/)
  assert.match(closed, /inert=""/)
  const opened = renderToStaticMarkup(<PanelShell open ariaLabel="Comments">Feedback</PanelShell>)
  assert.match(opened, /role="complementary"/)
  assert.match(opened, /aria-label="Comments"/)
  assert.doesNotMatch(opened, /inert=/)
})

it("reserves at most 360px only on desktop and leaves at least 760px to read", () => {
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8")
  const panelRem = Number(css.match(/--va-annotation-panel-width: ([\d.]+)rem/)?.[1])
  assert.equal(panelRem * 16, 360)
  assert.ok(1280 - panelRem * 16 - 64 >= 760)
  assert.match(css, /@media \(min-width: 1280px\)/)
  assert.match(css, /height: var\(--va-annotation-sheet-height\)/)
  assert.match(css, /\.va-artifact-frame\[data-panel-open="true"\] \.va-rail-layout\s*\{\s*display: block/)
  assert.doesNotMatch(renderToStaticMarkup(<PanelShell open ariaLabel="Comments">Feedback</PanelShell>), /md:w-/)
})
