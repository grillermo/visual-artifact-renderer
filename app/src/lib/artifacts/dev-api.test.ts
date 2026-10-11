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
