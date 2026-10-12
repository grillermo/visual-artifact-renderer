import { readdir, readFile, stat } from "node:fs/promises"
import { homedir } from "node:os"
import { extname, resolve, sep } from "node:path"
import { annotationMutationRequestRejection } from "@agents/visual-artifact-annotations"
import {
  ArtifactNotFoundError,
  mutateAnnotationsDocument,
  parseAnnotationMutationsPayload,
  readAnnotationsDocument,
  resolveLocalAuthor,
} from "../../../../cli/src/lib/annotations"
import { parseBundleRoute, parseProjectRoute } from "../../../../cli/src/lib/paths"
import { ARTIFACT_TYPES } from "@agents/visual-artifact-annotations/contract"
import { readAnnotationMutationBody } from "../../../../cli/src/lib/annotation-body"

const ASSET_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
}

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ARTIFACT_TYPE_SET = new Set<string>(ARTIFACT_TYPES)

type Signals = { openThreads: number; openExcerpt?: string; published: boolean }
type ListEntry = Signals & { slug: string; title?: string; description?: string; artifactType?: string; topics?: string[]; modifiedAt: string }

const EXCERPT_MAX = 80

async function readJson(file: string): Promise<unknown> {
  try { return JSON.parse(await readFile(file, "utf8")) } catch { return undefined }
}

// Mirrors readArtifactSignals in cli/src/lib/scan.ts.
async function readSignals(bundleDir: string): Promise<Signals> {
  const annotations = await readJson(resolve(bundleDir, "annotations.json"))
  const publish = await readJson(resolve(bundleDir, "publish.json"))
  const threads = annotations && typeof annotations === "object" && Array.isArray((annotations as { threads?: unknown }).threads)
    ? (annotations as { threads: unknown[] }).threads
    : []
  const open = threads.filter((thread): thread is { updatedAt?: unknown; messages?: unknown } =>
    !!thread && typeof thread === "object" && (thread as { status?: unknown }).status === "open")
  const newest = [...open].sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")))[0]
  const firstMessage = newest && Array.isArray(newest.messages) ? newest.messages[0] : undefined
  const body = firstMessage && typeof firstMessage === "object" ? (firstMessage as { body?: unknown }).body : undefined
  const line = typeof body === "string" ? body.replace(/\s+/g, " ").trim() : ""
  return {
    openThreads: open.length,
    openExcerpt: line ? (line.length > EXCERPT_MAX ? `${line.slice(0, EXCERPT_MAX - 1)}…` : line) : undefined,
    published: !!publish && typeof publish === "object" && (publish as { status?: unknown }).status === "published",
  }
}

// Mirrors cli/src/lib/scan.ts. Importing that file drags cli/node_modules into webpack, which can't parse it.
async function listProject(projectDir: string): Promise<ListEntry[]> {
  const out: ListEntry[] = []
  let entries
  try {
    entries = await readdir(projectDir, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return out
    throw error
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || !KEBAB.test(entry.name)) continue
    const file = resolve(projectDir, entry.name, "artifact.json")
    let raw: string
    let mtime: Date
    try {
      raw = await readFile(file, "utf8")
      mtime = (await stat(file)).mtime
    } catch {
      continue
    }
    let meta: Record<string, unknown> = {}
    try { meta = JSON.parse(raw) } catch { /* keep the entry, without metadata */ }
    const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : undefined)
    out.push({
      ...(await readSignals(resolve(projectDir, entry.name))),
      slug: entry.name,
      title: str(meta.title),
      description: str(meta.description),
      artifactType: typeof meta.artifactType === "string" && ARTIFACT_TYPE_SET.has(meta.artifactType) ? meta.artifactType : undefined,
      topics: Array.isArray(meta.topics) ? meta.topics.filter((t): t is string => typeof t === "string" && t.length > 0) : undefined,
      modifiedAt: mtime.toISOString(),
    })
  }
  return out.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
}

const NO_STORE = { "Cache-Control": "no-store" }

/** Same shape as the CLI static server's /data/artifacts/index.json. */
async function serveHomeIndex(artifactsDir: string): Promise<Response> {
  const projects: { name: string; artifactCount: number; lastModifiedAt: string }[] = []
  const artifacts: (ListEntry & { project: string })[] = []
  let entries: { name: string; isDirectory(): boolean }[] = []
  try { entries = await readdir(artifactsDir, { withFileTypes: true }) } catch { /* empty store */ }
  for (const entry of entries) {
    if (!entry.isDirectory() || !KEBAB.test(entry.name)) continue
    const list = await listProject(resolve(artifactsDir, entry.name))
    if (list.length === 0) continue
    projects.push({ name: entry.name, artifactCount: list.length, lastModifiedAt: list[0].modifiedAt })
    artifacts.push(...list.map((a) => ({ ...a, project: entry.name })))
  }
  projects.sort((a, b) => b.lastModifiedAt.localeCompare(a.lastModifiedAt))
  artifacts.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
  return Response.json({ projects, recent: artifacts.slice(0, 3), artifacts }, { headers: NO_STORE })
}

/** Same shape as the CLI static server's /data/artifacts/<project>/index.json. */
async function serveProjectIndex(artifactsDir: string, project: string): Promise<Response> {
  const route = parseProjectRoute(project)
  if (!route) return new Response("Not found", { status: 404 })
  const projectDir = resolve(artifactsDir, route.project)
  if (!projectDir.startsWith(artifactsDir + sep)) return new Response("Not found", { status: 404 })
  try {
    if (!(await stat(projectDir)).isDirectory()) return new Response("Not found", { status: 404 })
  } catch {
    return new Response("Not found", { status: 404 })
  }
  return Response.json({ project: route.project, artifacts: await listProject(projectDir) }, { headers: NO_STORE })
}

export function devArtifactsDir(): string {
  const skillRoot = process.env.VISUAL_ARTIFACT_SKILL_ROOT ?? resolve(homedir(), ".agents/skills/visual-artifact")
  return resolve(process.env.VISUAL_ARTIFACT_ARTIFACTS_DIR ?? resolve(skillRoot, "artifacts"))
}

/** Dev-only HTTP boundary. Reuse the CLI's validation, queue and atomic writer. */
export async function serveDevArtifactRequest(request: Request, artifactsDir = devArtifactsDir()): Promise<Response> {
  const pathname = new URL(request.url).pathname.replace(/\/+$/, "")
  if (pathname === "/api/annotations/author") {
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405 })
    return Response.json(await resolveLocalAuthor())
  }
  if (pathname === "/data/artifacts/index.json") return serveHomeIndex(artifactsDir)
  const projectIndex = pathname.match(/^\/data\/artifacts\/([^/]+)\/index\.json$/)
  if (projectIndex) return serveProjectIndex(artifactsDir, projectIndex[1])
  const api = pathname.match(/^\/api\/annotations\/([^/]+)\/([^/]+)$/)
  const asset = pathname.match(/^\/data\/artifacts\/([^/]+)\/([^/]+)\/assets\/(.+)$/)
  if (asset) return serveAsset(request, artifactsDir, asset[1], asset[2], asset[3])
  const data = pathname.match(/^\/data\/artifacts\/([^/]+)\/([^/]+)\/(artifact|annotations)\.json$/)
  const match = api ?? data
  if (!match) return new Response("Not found", { status: 404 })
  const route = parseBundleRoute(match[1], match[2])
  if (!route) return new Response("Invalid project or slug", { status: 400 })

  try {
    if (api) {
      if (request.method !== "POST") return new Response("Method not allowed", { status: 405 })
      const rejection = annotationMutationRequestRejection(request)
      if (rejection) return Response.json({ error: rejection.message }, { status: rejection.status })
      const body = await readAnnotationMutationBody(request)
      if (body._tag !== "json") {
        return Response.json({ error: body._tag }, { status: body._tag === "too-large" ? 413 : 400 })
      }
      let mutations
      try {
        mutations = parseAnnotationMutationsPayload(body.value)
      } catch {
        return Response.json({ error: "Invalid annotation mutations" }, { status: 400 })
      }
      return Response.json(await mutateAnnotationsDocument(artifactsDir, route, mutations))
    }
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405 })
    if (match[3] === "annotations") {
      return Response.json(await readAnnotationsDocument(artifactsDir, route), { headers: { "Cache-Control": "no-store" } })
    }
    return new Response(await readFile(resolve(artifactsDir, route.project, route.slug, "artifact.json")), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    })
  } catch (error) {
    if (error instanceof ArtifactNotFoundError || (error instanceof Error && "code" in error && error.code === "ENOENT")) {
      return new Response("Not found", { status: 404 })
    }
    console.error("Dev artifact request failed", error)
    return Response.json({ error: "Failed to save or load artifact feedback" }, { status: 500 })
  }
}

async function serveAsset(request: Request, artifactsDir: string, project: string, slug: string, rawPath: string): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 })
  const route = parseBundleRoute(project, slug)
  if (!route) return new Response("Invalid project or slug", { status: 400 })
  let relative: string
  try {
    relative = decodeURIComponent(rawPath)
  } catch {
    return new Response("Invalid asset path", { status: 400 })
  }
  const type = ASSET_TYPES[extname(relative).toLowerCase()]
  if (!type) return new Response("Not found", { status: 404 })
  const assetsRoot = resolve(artifactsDir, route.project, route.slug, "assets")
  const file = resolve(assetsRoot, relative)
  if (!file.startsWith(assetsRoot + sep)) return new Response("Invalid asset path", { status: 400 })
  try {
    const body = await readFile(file)
    return new Response(request.method === "HEAD" ? null : body, { headers: { "Content-Type": type, "Cache-Control": "no-store" } })
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return new Response("Not found", { status: 404 })
    throw error
  }
}
