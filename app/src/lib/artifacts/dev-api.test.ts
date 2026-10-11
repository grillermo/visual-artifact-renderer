import { it } from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { serveDevArtifactRequest } from "./dev-api"

it("persists dev POSTs with and without trailing slashes in the artifact bundle", async () => {
  const root = await mkdtemp(join(tmpdir(), "va-dev-feedback-"))
  try {
    const bundle = join(root, "node-redesign", "every-node")
    await mkdir(bundle, { recursive: true })
    await writeFile(join(bundle, "artifact.json"), "{}")
    const now = "2026-10-11T12:00:00.000Z"
    for (const [index, suffix] of ["", "/"].entries()) {
      const response = await serveDevArtifactRequest(new Request(`http://localhost:9991/api/annotations/node-redesign/every-node${suffix}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", origin: "http://localhost:9991", "sec-fetch-site": "same-origin" },
        body: JSON.stringify([{ type: "createThread", thread: {
          id: `thread-${index}`, anchor: { nodePath: "nodes.0.children.0", nodeType: "prose" }, status: "open",
          createdAt: now, updatedAt: now,
          messages: [{ id: `message-${index}`, author: { name: "Reviewer", email: "reviewer@example.test" }, body: `Feedback ${index}`, createdAt: now, updatedAt: now }],
        } }]),
      }), root)
      assert.equal(response.status, 200)
    }
    const saved = JSON.parse(await readFile(join(bundle, "annotations.json"), "utf8"))
    assert.equal(saved.threads.length, 2)
    assert.equal(saved.threads[1].messages[0].body, "Feedback 1")
    const loaded = await serveDevArtifactRequest(new Request("http://localhost:9991/data/artifacts/node-redesign/every-node/annotations.json"), root)
    assert.deepEqual(await loaded.json(), saved)
    const forbidden = await serveDevArtifactRequest(new Request("http://localhost:9991/api/annotations/node-redesign/every-node", {
      method: "POST", headers: { "Content-Type": "application/json", origin: "https://elsewhere.test" }, body: "[]",
    }), root)
    assert.equal(forbidden.status, 403)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

it("serves bundle assets in dev and refuses paths outside the assets folder", async () => {
  const root = await mkdtemp(join(tmpdir(), "va-dev-assets-"))
  try {
    await mkdir(join(root, "proj", "slug", "assets", "shots"), { recursive: true })
    await writeFile(join(root, "proj", "slug", "assets", "shots", "a b.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    await writeFile(join(root, "proj", "slug", "artifact.json"), "{}")

    const ok = await serveDevArtifactRequest(new Request("http://x/data/artifacts/proj/slug/assets/shots/a%20b.png"), root)
    assert.equal(ok.status, 200)
    assert.equal(ok.headers.get("content-type"), "image/png")
    assert.equal(Buffer.from(await ok.arrayBuffer()).length, 4)

    const missing = await serveDevArtifactRequest(new Request("http://x/data/artifacts/proj/slug/assets/none.png"), root)
    assert.equal(missing.status, 404)

    const escape = await serveDevArtifactRequest(new Request("http://x/data/artifacts/proj/slug/assets/..%2F..%2Fslug%2Fx.png"), root)
    assert.equal(escape.status, 400)

    const notImage = await serveDevArtifactRequest(new Request("http://x/data/artifacts/proj/slug/assets/..%2Fartifact.json"), root)
    assert.equal(notImage.status, 404)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

it("serves home and project indexes in dev, 404 for unknown projects", async () => {
  const dir = await mkdtemp(join(tmpdir(), "va-dev-index-"))
  try {
    await mkdir(join(dir, "demo", "first"), { recursive: true })
    await writeFile(join(dir, "demo", "first", "artifact.json"), JSON.stringify({ title: "First", artifactType: "explainer" }))
    const home = await serveDevArtifactRequest(new Request("http://x/data/artifacts/index.json"), dir)
    assert.equal(home.status, 200)
    const homeBody = await home.json()
    assert.deepEqual(homeBody.projects.map((p: { name: string }) => p.name), ["demo"])
    const project = await serveDevArtifactRequest(new Request("http://x/data/artifacts/demo/index.json"), dir)
    assert.equal(project.status, 200)
    const body = await project.json()
    assert.equal(body.project, "demo")
    assert.equal(body.artifacts[0].slug, "first")
    assert.equal(body.artifacts[0].title, "First")
    const missing = await serveDevArtifactRequest(new Request("http://x/data/artifacts/nope/index.json"), dir)
    assert.equal(missing.status, 404)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

// Keep in step with "home index" in cli/src/lib/scan.test.ts: both servers must return the same rows.
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

it("home index parity: serves every artifact with open-comment and publish signals", async () => {
  const dir = await mkdtemp(join(tmpdir(), "va-dev-library-"))
  try {
    await writeLibraryFixture(dir)
    const body = await (await serveDevArtifactRequest(new Request("http://x/data/artifacts/index.json"), dir)).json()
    assert.equal(body.artifacts.length, 107)
    assert.equal(body.recent.length, 3)
    const reviewed = body.artifacts.find((a: { slug: string }) => a.slug === "reviewed")
    assert.equal(reviewed.project, "reviews")
    assert.equal(reviewed.openThreads, 2)
    assert.equal(reviewed.openExcerpt, "the last row is incorrect")
    assert.equal(reviewed.published, true)
    const broken = body.artifacts.find((a: { slug: string }) => a.slug === "broken-sidecars")
    assert.equal(broken.openThreads, 0)
    assert.equal(broken.published, false)
    assert.equal(broken.openExcerpt, undefined)
    const project = await (await serveDevArtifactRequest(new Request("http://x/data/artifacts/reviews/index.json"), dir)).json()
    const row = project.artifacts.find((a: { slug: string }) => a.slug === "reviewed")
    assert.equal(row.openThreads, 2)
    assert.equal(row.published, true)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
