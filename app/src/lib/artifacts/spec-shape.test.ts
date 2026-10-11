import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { isLegacyOnlySpec } from "./spec-shape"
import type { ArtifactNode } from "@/lib/contract/artifact-schema"

const n = (type: string, children?: unknown[]) => ({ type, props: {}, children }) as unknown as ArtifactNode

describe("isLegacyOnlySpec", () => {
  test("legacy nodes only", () => {
    assert.equal(isLegacyOnlySpec({ nodes: [n("section", [n("card", [n("text")]), n("status-grid")]), n("table")] }), true)
  })
  test("editorial node at the top", () => {
    assert.equal(isLegacyOnlySpec({ nodes: [n("chapter")] }), false)
  })
  test("editorial node nested deep", () => {
    assert.equal(isLegacyOnlySpec({ nodes: [n("section", [n("grid", [n("ledger")])])] }), false)
  })
  test("prose and timeline predate the redesign", () => {
    assert.equal(isLegacyOnlySpec({ nodes: [n("prose"), n("timeline")] }), true)
  })
  test("empty spec", () => {
    assert.equal(isLegacyOnlySpec({ nodes: [] }), true)
  })
})
