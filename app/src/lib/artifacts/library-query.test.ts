import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  normaliseQuery,
  parseLibraryQuery,
  parseOperator,
  queryText,
  toggleOperator,
  withoutKey,
  withoutOperator,
} from "./library-query"

describe("library search query", () => {
  test("splits operators from free-text terms", () => {
    assert.deepEqual(parseLibraryQuery("  Benchmark type:review project:flue-pi-agent is:open  agents "), {
      terms: ["benchmark", "agents"],
      types: ["review"],
      projects: ["flue-pi-agent"],
      topics: [],
      states: ["open"],
    })
  })

  test("collects repeated operators once and reads updated:Nd", () => {
    const query = parseLibraryQuery("type:plan type:review type:plan topic:react updated:7d")
    assert.deepEqual(query.types, ["plan", "review"])
    assert.deepEqual(query.topics, ["react"])
    assert.equal(query.updatedWithinDays, 7)
  })

  test("treats unknown keys and invalid values as search terms", () => {
    assert.equal(parseOperator("type:poster"), null)
    assert.equal(parseOperator("is:closed"), null)
    assert.equal(parseOperator("project:Not_Kebab"), null)
    assert.equal(parseOperator("http://example.com"), null)
    assert.equal(parseOperator(":open"), null)
    assert.equal(parseOperator("is:"), null)
    assert.deepEqual(parseLibraryQuery("type:poster note:x").terms, ["type:poster", "note:x"])
  })

  test("operator keys and values are case-insensitive", () => {
    assert.deepEqual(parseOperator("IS:Open"), { key: "is", value: "open" })
    assert.deepEqual(parseOperator("Type:REVIEW"), { key: "type", value: "review" })
  })

  test("toggles operators while keeping the reader's text", () => {
    assert.equal(toggleOperator("benchmark", { key: "is", value: "open" }), "is:open benchmark")
    assert.equal(toggleOperator("is:open benchmark", { key: "is", value: "open" }), "benchmark")
    assert.equal(
      toggleOperator("type:plan benchmark", { key: "type", value: "review" }, { exclusive: true }),
      "type:review benchmark",
    )
    assert.equal(
      toggleOperator("type:plan", { key: "type", value: "review" }),
      "type:plan type:review",
    )
  })

  test("removes one operator or a whole key", () => {
    assert.equal(withoutOperator("a type:plan b type:review", { key: "type", value: "plan" }), "a b type:review")
    assert.equal(withoutKey("a type:plan is:open type:review", "type"), "a is:open")
    assert.equal(queryText("type:plan agent  runtime is:open"), "agent runtime")
    assert.equal(normaliseQuery("  a   b "), "a b")
  })
})
