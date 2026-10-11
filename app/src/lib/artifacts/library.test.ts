import assert from "node:assert/strict"
import { describe, test } from "node:test"

import type { RecentArtifact } from "./artifact-index"
import {
  activityTicks,
  filterRows,
  foldArtifacts,
  groupProjects,
  groupRows,
  libraryFacets,
  nowStrip,
  projectActivity,
} from "./library"

const NOW = Date.parse("2026-10-12T12:00:00.000Z")

function art(partial: Partial<RecentArtifact> & { project: string; slug: string }): RecentArtifact {
  return { title: partial.slug, artifactType: "report", modifiedAt: "2026-10-10T10:00:00.000Z", ...partial }
}

const library: RecentArtifact[] = [
  art({ project: "var", slug: "refactor", title: "Refactor", modifiedAt: "2026-07-07T10:00:00.000Z" }),
  art({ project: "var", slug: "refactor-v2", title: "Refactor", modifiedAt: "2026-07-08T10:00:00.000Z" }),
  art({ project: "var", slug: "refactor-v3", title: "Refactor", modifiedAt: "2026-07-07T11:00:00.000Z", openThreads: 1 }),
  art({ project: "project-atlas", slug: "diagram-gallery", title: "Every diagram", artifactType: "diagram", modifiedAt: "2026-10-09T10:00:00.000Z" }),
  art({ project: "ui-v2-samples", slug: "project-atlas-diagram-gallery", title: "Every diagram", artifactType: "diagram", modifiedAt: "2026-10-11T10:00:00.000Z", published: true }),
  art({ project: "agents2", slug: "week", title: "What changed", artifactType: "explainer", openThreads: 2 }),
  art({ project: "node-redesign-proj", slug: "after-week", title: "What changed", artifactType: "explainer" }),
  art({ project: "var", slug: "test", title: "Test", modifiedAt: "2026-10-11T09:00:00.000Z" }),
  art({ project: "flue", slug: "bench", title: "Benchmark", artifactType: "review", topics: ["agents"], modifiedAt: "2026-07-30T10:00:00.000Z" }),
]

describe("library folding", () => {
  test("folds a -vN chain under the highest version", () => {
    const row = foldArtifacts(library).find((r) => r.artifact.title === "Refactor")!
    assert.equal(row.artifact.slug, "refactor-v3")
    assert.equal(row.version, "v3")
    assert.deepEqual(row.folded.map((f) => [f.kind, f.label]), [["version", "v2"], ["version", "v1"]])
    assert.equal(row.openThreads, 1)
  })

  test("keeps the original and folds sample copies and after- snapshots", () => {
    const rows = foldArtifacts(library)
    const gallery = rows.find((r) => r.artifact.title === "Every diagram")!
    assert.equal(gallery.key, "project-atlas/diagram-gallery")
    assert.deepEqual(gallery.folded.map((f) => [f.kind, f.label]), [["copy", "ui-v2-samples"]])
    const week = rows.find((r) => r.artifact.title === "What changed")!
    assert.equal(week.artifact.project, "agents2")
    assert.equal(week.openThreads, 2)
    assert.equal(rows.length, 5, "nine artifacts fold into five rows; nothing is lost")
    assert.equal(rows.reduce((n, r) => n + 1 + r.folded.length, 0), library.length)
  })
})

describe("library filtering", () => {
  const rows = foldArtifacts(library)
  const keys = (raw: string) => filterRows(rows, raw, NOW).map((r) => r.artifact.slug)

  test("hides fixtures unless asked or searched", () => {
    assert.ok(!keys("").includes("test"))
    assert.deepEqual(keys("is:fixture"), ["test"])
    assert.ok(keys("test").includes("test"))
  })

  test("combines operators and terms", () => {
    assert.deepEqual(keys("is:open"), ["week", "refactor-v3"])
    assert.deepEqual(keys("type:review agents"), ["bench"])
    assert.deepEqual(keys("type:review type:diagram"), ["diagram-gallery", "bench"])
    assert.deepEqual(keys("project:ui-v2-samples"), ["diagram-gallery"], "a folded copy's project still finds its row")
    assert.deepEqual(keys("is:published"), ["diagram-gallery"])
    assert.deepEqual(keys("updated:7d"), ["week", "diagram-gallery"])
  })

  test("facet counts ignore their own selection", () => {
    const facets = libraryFacets(rows, "type:review", NOW)
    assert.equal(facets.allTypes, 4)
    assert.deepEqual(facets.types.find((f) => f.value === "diagram"), { value: "diagram", count: 1 })
    assert.equal(facets.states.find((f) => f.value === "open")!.count, 0)
  })
})

describe("library grouping", () => {
  test("labels weeks relative to today", () => {
    const groups = groupRows(filterRows(foldArtifacts(library), "", NOW), "week", NOW)
    assert.deepEqual(groups.map((g) => g.label), ["Last week", "Week of 27 July", "Week of 6 July"])
  })

  test("now strip leads with open comments, then this week, never fixtures", () => {
    const strip = nowStrip(foldArtifacts(library), NOW, 3)
    assert.deepEqual(strip.rows.map((r) => r.artifact.slug), ["week", "diagram-gallery", "refactor-v3"])
    assert.equal(strip.openCount, 2)
    assert.equal(strip.recentCount, 2)
  })

  test("projects group under their repo and draw a 12-week strip", () => {
    const groups = groupProjects(projectActivity(library, NOW))
    assert.equal(groups[0].repo, "visual-artifact-renderer")
    assert.deepEqual(groups[0].projects.map((p) => p.name), ["ui-v2-samples", "var", "node-redesign-proj"])
    assert.equal(groups.at(-1)!.repo, undefined)
    assert.equal(activityTicks([0, 1, 4]), "▁▂▇")
  })
})
