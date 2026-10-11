import { describe, expect, test } from "bun:test"
import { readdir, readFile, writeFile, mkdtemp, rm } from "node:fs/promises"
import { resolve, join, dirname } from "node:path"
import { tmpdir } from "node:os"

import {
  ARTIFACT_NODE_TYPES,
  ArtifactResourceError,
  ArtifactValidationError,
  RAW_ARTIFACT_MAX_BYTES,
  VisualArtifactSpecSchema,
  parseRawArtifactJson,
  parseVisualArtifactSpec,
  preflightArtifactSpec,
} from "@agents/visual-artifact-annotations/contract"

import { validateSpec, ValidationError } from "./validate.ts"

const FIXTURES_DIR = resolve(import.meta.dir, "..", "..", "shared", "fixtures")
const SAVED_ARTIFACTS_DIR = resolve(import.meta.dir, "..", "..", "artifacts")
const CLI_MAIN = resolve(import.meta.dir, "main.ts")
const CLI_DIR = dirname(CLI_MAIN)

async function loadFixture(...parts: string[]): Promise<unknown> {
  const raw = await readFile(join(FIXTURES_DIR, ...parts), "utf8")
  return JSON.parse(raw)
}

async function findSavedJsonFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    const entryPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await findSavedJsonFiles(entryPath))
    } else if (
      entry.name.endsWith(".json") &&
      entry.name !== "annotations.json" &&
      entry.name !== "publish.json"
    ) {
      files.push(entryPath)
    }
  }
  return files
}

function specWith(node: unknown): unknown {
  return {
    slug: "validation-regression",
    title: "Validation Regression",
    nodes: [node],
  }
}

describe("validateSpec shared schema parity", () => {
  test("accepts valid minimal specs", () => {
    expect(validateSpec(specWith({ type: "prose", props: { content: "Hi" } })).slug).toBe("validation-regression")
  })
  test("rejects slugs longer than 80 chars", () => {
    const spec = { title: "Hi", slug: "a".repeat(81), nodes: [{ type: "prose", props: { content: "Hi" } }] }
    expect(() => validateSpec(spec)).toThrow(/slug/)
  })
  test("rejects removed node types rather than warning", () => {
    for (const type of ["button", "stepper", "tabs", "flow", "code-block", "pie-chart"]) {
      expect(() => validateSpec(specWith({ type, props: {} }))).toThrow(ValidationError)
    }
  })
  test("validates checklist states and nested extra properties", () => {
    expect(validateSpec(specWith({ type: "checklist", props: { items: [{ text: "Deploy", state: "todo" }] } })).nodes).toHaveLength(1)
    expect(() => validateSpec(specWith({ type: "checklist", props: { items: [{ text: "Deploy", state: "unknown" }] } }))).toThrow(ValidationError)
    expect(() => validateSpec(specWith({ type: "checklist", props: { items: [{ text: "Deploy", state: "todo", unexpected: "nope" }] } }))).toThrow(/unexpected/)
  })
  test("validates file-tree item types", () => {
    expect(() => validateSpec(specWith({ type: "file-tree", props: { items: [{ name: "src", type: "folder" }] } }))).toThrow(/file|directory/)
    expect(validateSpec(specWith({ type: "file-tree", props: { items: [{ name: "README.md" }] } })).nodes).toHaveLength(1)
  })
  test("rejects steps with fewer than two items", () => {
    expect(() => validateSpec(specWith({ type: "steps", props: { items: [{ title: "Only one" }] } }))).toThrow(/>=2/)
  })
  test("validates table columns", () => {
    expect(() => validateSpec(specWith({ type: "table", props: { dataKey: "rows", columns: [] } }))).toThrow(/>=1/)
    expect(() => validateSpec(specWith({ type: "table", props: { dataKey: "rows", columns: [{ key: "name", extra: "nope" }] } }))).toThrow(ValidationError)
  })
  test("rejects extra properties on nested children", () => {
    expect(() => validateSpec(specWith({ type: "chapter", props: { title: "One" }, children: [{ type: "prose", props: { content: "Hi", extra: "nope" } }] }))).toThrow(/extra/)
  })
  test("rejects file URLs in image src", () => {
    expect(() => validateSpec(specWith({ type: "image", props: { src: "file:///tmp/secret.png", alt: "Secret" } }))).toThrow(/file:\/\//)
  })
  test("links reject local and executable URLs", () => {
    for (const href of ["file:///tmp/secret", "javascript:alert(1)", " \njava\tscript:alert(1)", "data:text/html,<script>alert(1)</script>", "foo:bar"]) {
      expect(() => validateSpec(specWith({ type: "links", props: { items: [{ label: "Open", href }] } }))).toThrow(ValidationError)
    }
    for (const href of ["https://example.com", "./relative/path", "#section", "mailto:test@example.com"]) {
      expect(validateSpec(specWith({ type: "links", props: { items: [{ label: "Open", href }] } })).nodes[0].type).toBe("links")
    }
  })
  test("requires array-backed data for every dataKey node", () => {
    expect(() => validateSpec(specWith({ type: "table", props: { dataKey: "shares" } }))).toThrow(/data\.shares must be an array/)
  })
  test("requires dataset rows to be objects", () => {
    expect(() => validateSpec({ slug: "invalid-rows", title: "Invalid rows", data: { shares: [1] }, nodes: [{ type: "table", props: { dataKey: "shares" } }] })).toThrow(/data\.shares\[0\] must be an object/)
  })
  test("rejects non-integer diagram heights", () => {
    expect(() => validateSpec(specWith({ type: "mermaid", props: { caption: "Flowchart", code: "flowchart LR\n  A --> B", height: 240.5 } }))).toThrow(ValidationError)
  })
})

describe("audit regression fixtures", () => {
  test("unknown root property fails with path", async () => {
    const spec = await loadFixture("invalid", "unknown-root.json")
    const result = VisualArtifactSpecSchema.safeParse(spec)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("unexpectedRoot"))).toBe(true)
    }
  })

  test("numeric metadata.id fails with path", async () => {
    const spec = await loadFixture("invalid", "metadata-id-number.json")
    const result = VisualArtifactSpecSchema.safeParse(spec)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."))
      expect(paths.some((p) => p.includes("metadata.id"))).toBe(true)
    }
  })

  test("scalar gitStatus fails with path", async () => {
    const spec = await loadFixture("invalid", "gitstatus-scalar.json")
    const result = VisualArtifactSpecSchema.safeParse(spec)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."))
      expect(paths.some((p) => p.includes("gitStatus"))).toBe(true)
    }
  })

  test("empty diff props fails with path", async () => {
    const spec = await loadFixture("invalid", "diff-empty.json")
    expect(() => parseVisualArtifactSpec(spec)).toThrow(ArtifactValidationError)
    expect(() => parseVisualArtifactSpec(spec)).toThrow(/code/)
  })
})

describe("resource envelope", () => {
  test("31 top-level nodes fails", async () => {
    const spec = await loadFixture("invalid", "31-top-level.json")
    expect(() => parseVisualArtifactSpec(spec)).toThrow(ArtifactResourceError)
  })

  test("21 datasets fails", async () => {
    const spec = await loadFixture("invalid", "21-datasets.json")
    expect(() => parseVisualArtifactSpec(spec)).toThrow(ArtifactResourceError)
  })

  test("101 total nodes fails independently", async () => {
    const spec = await loadFixture("invalid", "101-nodes.json")
    expect((spec as { nodes: unknown[] }).nodes).toHaveLength(30)
    expect(() => parseVisualArtifactSpec(spec)).toThrow(ArtifactResourceError)
    expect(VisualArtifactSpecSchema.safeParse(spec).success).toBe(false)
  })

  test("node depth 9 fails without stack overflow", async () => {
    const spec = await loadFixture("invalid", "depth-9.json")
    expect(() => parseVisualArtifactSpec(spec)).toThrow(ArtifactResourceError)
  })

  test("501 file-tree items fails", async () => {
    const spec = await loadFixture("invalid", "file-tree-501.json")
    expect(() => parseVisualArtifactSpec(spec)).toThrow(ArtifactResourceError)
  })

  test("nested 501 file-tree items fails", async () => {
    const spec = await loadFixture("invalid", "file-tree-nested-501.json")
    expect(() => parseVisualArtifactSpec(spec)).toThrow(ArtifactResourceError)
  })

  test("501 items split across file-tree nodes fails the aggregate limit", async () => {
    const spec = await loadFixture("invalid", "file-tree-aggregate-501.json")
    expect(() => parseVisualArtifactSpec(spec)).toThrow(ArtifactResourceError)
  })

  test("file-tree depth 13 fails", async () => {
    const spec = await loadFixture("invalid", "file-tree-depth-13.json")
    expect(() => parseVisualArtifactSpec(spec)).toThrow(ArtifactResourceError)
  })

  test("valid max boundary passes", async () => {
    const spec = await loadFixture("valid", "max-boundary.json")
    const result = parseVisualArtifactSpec(spec)
    const preflight = preflightArtifactSpec(spec).result
    expect(result.nodes.length).toBe(30)
    expect(Object.keys(result.data ?? {})).toHaveLength(20)
    expect(preflight.totalNodes).toBe(100)
    expect(preflight.maxDepth).toBe(8)
    expect(preflight.fileTreeItems).toBe(500)
    expect(preflight.fileTreeMaxDepth).toBe(12)
  })

  test("representative major-three fixture passes", async () => {
    const spec = await loadFixture("valid", "representative.json")
    const result = parseVisualArtifactSpec(spec)
    expect(result.nodes.length).toBeGreaterThan(0)
  })

  test("accepts optional artifact classification metadata", () => {
    const result = parseVisualArtifactSpec({
      slug: "classified-artifact",
      title: "Classified artifact",
      artifactType: "explainer",
      topics: ["runtime", "typescript"],
      nodes: [{ type: "prose", props: { content: "Content" } }],
    })
    expect(result.artifactType).toBe("explainer")
    expect(result.topics).toEqual(["runtime", "typescript"])
  })

  test("rejects unknown artifact classifications", () => {
    expect(() => parseVisualArtifactSpec({
      slug: "unknown-classification",
      title: "Unknown classification",
      artifactType: "memo",
      nodes: [{ type: "prose", props: { content: "Content" } }],
    })).toThrow(ArtifactValidationError)
  })

  test("very deep input is rejected before recursive Zod parsing", () => {
    let node: Record<string, unknown> = { type: "prose", props: { content: "leaf" } }
    for (let depth = 0; depth < 10_000; depth++) {
      node = { type: "chapter", props: { title: "Depth" }, children: [node] }
    }
    const result = VisualArtifactSpecSchema.safeParse({
      slug: "very-deep",
      title: "Very deep",
      nodes: [node],
    })
    expect(result.success).toBe(false)
  })

  test("raw JSON over 2 MiB fails before full parse", () => {
    const huge = {
      slug: "huge",
      title: "Huge",
      nodes: [{ type: "prose", props: { content: "x".repeat(RAW_ARTIFACT_MAX_BYTES + 1000) } }],
    }
    const raw = JSON.stringify(huge)
    expect(() => parseRawArtifactJson(raw)).toThrow(/bytes/)
  })
})

describe("saved major-three artifacts", () => {
  test("saved bundles with removed nodes are rejected; supported bundles validate", async () => {
    const files = await findSavedJsonFiles(SAVED_ARTIFACTS_DIR)
    if (files.length === 0) {
      // Clean clones ignore the runtime artifacts/ directory. Fall back to the
      // tracked representative compatibility fixture so the gate still asserts
      // real-world structural shapes.
      const spec = await loadFixture("valid", "representative.json")
      const result = parseVisualArtifactSpec(spec)
      expect(result.nodes.length).toBeGreaterThan(0)
      return
    }

    let total = 0
    for (const filePath of files) {
      const raw = await readFile(filePath, "utf8")
      let parsed: unknown
      try {
        parsed = parseRawArtifactJson(raw)
      } catch {
        continue
      }
      if (
        !parsed ||
        typeof parsed !== "object" ||
        !Array.isArray((parsed as Record<string, unknown>).nodes)
      ) {
        continue
      }
      total++
      const allowed = new Set<string>(ARTIFACT_NODE_TYPES)
      const usesRemovedNode = (nodes: unknown[]): boolean => nodes.some((node) => {
        if (!node || typeof node !== "object") return false
        const n = node as { type?: string; children?: unknown[] }
        return !allowed.has(n.type ?? "") || (Array.isArray(n.children) && usesRemovedNode(n.children))
      })
      const hasRemoved = usesRemovedNode((parsed as { nodes: unknown[] }).nodes)
      const result = VisualArtifactSpecSchema.safeParse(parsed)
      expect(result.success).toBe(!hasRemoved)
      if (hasRemoved && !result.success) {
        expect(result.error.issues.some((issue) => issue.path.at(-1) === "type")).toBe(true)
      }
    }
    expect(total).toBeGreaterThanOrEqual(2)
  })
})

describe("CLI subprocess validation", () => {
  async function runValidate(
    fixturePath: string = "-",
    input?: string,
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const proc = Bun.spawn([process.execPath, CLI_MAIN, "validate", fixturePath], {
      cwd: CLI_DIR,
      stdin: input === undefined ? "ignore" : "pipe",
      stdout: "pipe",
      stderr: "pipe",
    })
    if (input !== undefined && proc.stdin) {
      proc.stdin.write(input)
      proc.stdin.end()
    }
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])
    return { exitCode, stdout, stderr }
  }

  test("unknown root property exits 2 with path", async () => {
    const { exitCode, stderr } = await runValidate(join(FIXTURES_DIR, "invalid", "unknown-root.json"))
    expect(exitCode).toBe(2)
    expect(stderr).toContain("unexpectedRoot")
  })

  test("numeric metadata.id exits 2 with bracket path", async () => {
    const { exitCode, stderr } = await runValidate(join(FIXTURES_DIR, "invalid", "metadata-id-number.json"))
    expect(exitCode).toBe(2)
    expect(stderr).toContain("nodes[0].metadata.id")
  })

  test("scalar gitStatus exits 2 with bracket path", async () => {
    const { exitCode, stderr } = await runValidate(join(FIXTURES_DIR, "invalid", "gitstatus-scalar.json"))
    expect(exitCode).toBe(2)
    expect(stderr).toContain("nodes[0].props.gitStatus")
  })

  test("empty diff exits 2 with bracket path", async () => {
    const { exitCode, stderr } = await runValidate(join(FIXTURES_DIR, "invalid", "diff-empty.json"))
    expect(exitCode).toBe(2)
    expect(stderr).toContain("nodes[0].props")
  })

  for (const [fixture, expected] of [
    ["31-top-level.json", "top-level"],
    ["21-datasets.json", "datasets"],
    ["101-nodes.json", "nodes"],
    ["depth-9.json", "deeper"],
    ["file-tree-501.json", "file-tree"],
    ["file-tree-depth-13.json", "file-tree"],
    ["file-tree-aggregate-501.json", "file-tree"],
  ] as const) {
    test(`${fixture} exits 2`, async () => {
      const { exitCode, stderr } = await runValidate(join(FIXTURES_DIR, "invalid", fixture))
      expect(exitCode).toBe(2)
      expect(stderr).toContain(expected)
    })
  }

  test("invalid Mermaid exits 2", async () => {
    const dir = await mkdtemp(join(tmpdir(), "va-mermaid-invalid-"))
    const filePath = join(dir, "invalid.json")
    await writeFile(filePath, JSON.stringify({
      slug: "invalid-mermaid",
      title: "Invalid Mermaid",
      nodes: [{ type: "mermaid", props: { caption: "Broken", code: "graph TD\n A -- B" } }],
    }))
    const { exitCode, stderr } = await runValidate(filePath)
    await rm(dir, { recursive: true, force: true })
    expect(exitCode).toBe(2)
    expect(stderr).toContain("Mermaid diagram")
  })

  test("rejects non-regular file input without blocking", async () => {
    const dir = await mkdtemp(join(tmpdir(), "va-fifo-"))
    const filePath = join(dir, "artifact.fifo")
    const created = Bun.spawnSync(["mkfifo", filePath])
    expect(created.exitCode).toBe(0)
    const { exitCode, stderr } = await runValidate(filePath)
    await rm(dir, { recursive: true, force: true })
    expect(exitCode).toBe(2)
    expect(stderr).toContain("not a regular file")
  })

  test("oversized file exits 2 before full read", async () => {
    const dir = await mkdtemp(join(tmpdir(), "va-oversized-"))
    const filePath = join(dir, "huge.json")
    await writeFile(filePath, "x".repeat(RAW_ARTIFACT_MAX_BYTES + 1), "utf8")
    const { exitCode, stderr } = await runValidate(filePath)
    await rm(dir, { recursive: true, force: true })
    expect(exitCode).toBe(2)
    expect(stderr).toContain("bytes")
  })

  test("oversized stdin exits 2 before full accumulation", async () => {
    const { exitCode, stderr } = await runValidate(
      "-",
      "x".repeat(RAW_ARTIFACT_MAX_BYTES + 1),
    )
    expect(exitCode).toBe(2)
    expect(stderr).toContain("stdin exceeds")
  })
})
