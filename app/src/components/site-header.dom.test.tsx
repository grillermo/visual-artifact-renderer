import { it } from "node:test"
import assert from "node:assert/strict"
import React, { act } from "react"
import { createRoot } from "react-dom/client"
import { JSDOM } from "jsdom"
import { AnnotationProvider } from "./annotations/annotation-provider"
import { SiteHeader } from "./site-header"

it("keeps panel toggles controlled when opening, switching, closing and navigating", async (t) => {
  const dom = new JSDOM("<!DOCTYPE html><html><body><div id='root'></div></body></html>", {
    url: "http://localhost:9991/",
  })
  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    IS_REACT_ACT_ENVIRONMENT: true,
  }
  const previous = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
  }
  t.after(() => {
    dom.window.close()
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  })
  window.matchMedia = (query) => ({
    matches: query.includes("min-width"), media: query, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
    dispatchEvent: () => false,
  })
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    const url = String(input)
    assert.ok(url.endsWith("/annotations/author") || url.endsWith("/annotations.json"))
    return Response.json(url.endsWith("/annotations/author")
      ? { name: "Reviewer", email: "reviewer@example.test" }
      : { version: 1, project: "demo", slug: "slug", threads: [] })
  })
  const errors = t.mock.method(console, "error", () => {})
  const container = document.getElementById("root")
  assert.ok(container)
  const root = createRoot(container)
  try {
    await act(async () => {
      root.render(<AnnotationProvider project="demo" slug="slug"><SiteHeader /></AnnotationProvider>)
    })
    const comments = container.querySelector<HTMLButtonElement>('button[aria-label="Comments"]')
    const colab = container.querySelector<HTMLButtonElement>('button[aria-label="Colab"]')
    assert.ok(comments)
    assert.ok(colab)
    const assertSelection = (panel: "comments" | "colab" | null) => {
      assert.equal(new URLSearchParams(window.location.search).get("panel"), panel)
      assert.equal(comments.getAttribute("aria-pressed"), String(panel === "comments"))
      assert.equal(colab.getAttribute("aria-pressed"), String(panel === "colab"))
    }

    assertSelection(null)
    await act(() => comments.click())
    assertSelection("comments")
    assert.deepEqual(errors.mock.calls.map((call) => call.arguments), [])
    await act(() => colab.click())
    assertSelection("colab")
    await act(() => colab.click())
    assertSelection(null)
    await act(() => comments.click())
    assertSelection("comments")
    await act(() => comments.click())
    assertSelection(null)

    // A browser history change must update the selection without remounting.
    await act(() => {
      window.history.replaceState(null, "", "?panel=colab")
      window.dispatchEvent(new dom.window.PopStateEvent("popstate"))
    })
    assertSelection("colab")
    await act(() => {
      window.history.replaceState(null, "", "/")
      window.dispatchEvent(new dom.window.PopStateEvent("popstate"))
    })
    assertSelection(null)
    assert.deepEqual(errors.mock.calls.map((call) => call.arguments), [])
  } finally {
    await act(() => root.unmount())
  }
})
