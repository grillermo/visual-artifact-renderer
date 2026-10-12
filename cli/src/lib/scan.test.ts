import { describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { listProjectArtifacts, scanArtifacts } from "./scan.ts"

async function makeTempDir(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix))
}

describe("listProjectArtifacts", () => {
  test("lists bundled artifacts and ignores flat json files", async () => {
    const dir = await makeTempDir("visualizer-scan-")
    try {
      await mkdir(join(dir, "my-project", "bundled-artifact"), { recursive: true })
      await writeFile(
        join(dir, "my-project", "bundled-artifact", "artifact.json"),
        JSON.stringify({
          title: "Bundled",
          description: "desc",
          artifactType: "report",
          topics: ["release", "quality"],
        }),
        "utf8",
      )
      await writeFile(
        join(dir, "my-project", "ignored-artifact.json"),
        JSON.stringify({ title: "Ignored" }),
        "utf8",
      )

      const artifacts = await listProjectArtifacts(join(dir, "my-project"))
      expect(artifacts).toHaveLength(1)
      expect(artifacts[0].slug).toBe("bundled-artifact")
      expect(artifacts[0].title).toBe("Bundled")
      expect(artifacts[0].artifactType).toBe("report")
      expect(artifacts[0].topics).toEqual(["release", "quality"])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test("flat project/slug.json file is not part of the read path", async () => {
    const dir = await makeTempDir("visualizer-flat-")
    try {
      const projectDir = join(dir, "project")
      await mkdir(projectDir, { recursive: true })
      await writeFile(
        join(projectDir, "my-artifact.json"),
        JSON.stringify({ title: "Flat" }),
        "utf8",
      )
      const artifacts = await listProjectArtifacts(projectDir)
      expect(artifacts).toHaveLength(0)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe("scanArtifacts", () => {
  test("scans bundle directories across projects", async () => {
    const dir = await makeTempDir("visualizer-scan-")
    try {
      await mkdir(join(dir, "project-a", "artifact-one"), { recursive: true })
      await writeFile(
        join(dir, "project-a", "artifact-one", "artifact.json"),
        JSON.stringify({ title: "Artifact One" }),
        "utf8",
      )

      await mkdir(join(dir, "project-b", "artifact-two"), { recursive: true })
      await writeFile(
        join(dir, "project-b", "artifact-two", "artifact.json"),
        JSON.stringify({ title: "Artifact Two" }),
        "utf8",
      )

      const { projects, artifacts } = await scanArtifacts(dir)
      expect(projects).toHaveLength(2)
      expect(artifacts).toHaveLength(2)
      expect(artifacts.map((a) => a.slug).sort()).toEqual(["artifact-one", "artifact-two"])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

// Keep in step with "home index parity" in app/src/lib/artifacts/dev-api.test.ts.
async function writeLibraryFixture(dir: string): Promise<void> {
  for (let i = 0; i < 105; i++) {
    const bundle = join(dir, "bulk", `artifact-${i}`)
    await mkdir(bundle, { recursive: true })
    await writeFile(join(bundle, "artifact.json"), JSON.stringify({ title: `Artifact ${i}`, artifactType: "report" }))
  }
  const reviewed = join(dir, "reviews", "reviewed")
  await mkdir(reviewed, { recursive: true })
  await writeFile(join(reviewed, "artifact.json"), JSON.stringify({ title: "Reviewed", artifactType: "review" }))
  const thread = (id: string, status: string, updatedAt: string, body: string) => ({
    id, status, createdAt: updatedAt, updatedAt, anchor: { nodePath: "nodes.0", nodeType: "prose" },
    messages: [{ id: `${id}-m`, author: { name: "R" }, body, createdAt: updatedAt, updatedAt }],
  })
  await writeFile(join(reviewed, "annotations.json"), JSON.stringify({ version: 1, project: "reviews", slug: "reviewed", threads: [
    thread("a", "open", "2026-10-01T00:00:00.000Z", "older note"),
    thread("b", "open", "2026-10-02T00:00:00.000Z", "  the last\n row is   incorrect "),
    thread("c", "resolved", "2026-10-03T00:00:00.000Z", "done"),
  ] }))
  await writeFile(join(reviewed, "publish.json"), JSON.stringify({ version: 1, status: "published" }))
  const broken = join(dir, "reviews", "broken-sidecars")
  await mkdir(broken, { recursive: true })
  await writeFile(join(broken, "artifact.json"), JSON.stringify({ title: "Broken" }))
  await writeFile(join(broken, "annotations.json"), "{not json")
  await writeFile(join(broken, "publish.json"), JSON.stringify({ status: "unpublished" }))
}

describe("home index", () => {
  test("serves every artifact with open-comment and publish signals", async () => {
    const dir = await makeTempDir("visualizer-index-")
    try {
      await writeLibraryFixture(dir)
      const { serveData } = await import("../commands/serve.ts")
      const response = await serveData("/data/artifacts/index.json", dir, "/data/artifacts")
      const body = await response.json()
      expect(body.artifacts).toHaveLength(107)
      expect(body.recent).toHaveLength(3)
      const reviewed = body.artifacts.find((a: { slug: string }) => a.slug === "reviewed")
      expect(reviewed).toMatchObject({ project: "reviews", openThreads: 2, openExcerpt: "the last row is incorrect", published: true })
      const broken = body.artifacts.find((a: { slug: string }) => a.slug === "broken-sidecars")
      expect(broken).toMatchObject({ openThreads: 0, published: false })
      expect(broken.openExcerpt).toBeUndefined()
      const project = await (await serveData("/data/artifacts/reviews/index.json", dir, "/data/artifacts")).json()
      expect(project.artifacts.find((a: { slug: string }) => a.slug === "reviewed")).toMatchObject({ openThreads: 2, published: true })
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
