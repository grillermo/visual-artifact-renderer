import { readdir, readFile, stat } from "node:fs/promises"
import { join } from "node:path"
import { ARTIFACT_TYPES, type ArtifactType } from "@agents/visual-artifact-annotations/contract"
import { BUNDLE_FILES } from "./paths.ts"
import { fileExists, isKebabCase } from "../util.ts"

export interface ArtifactMeta {
  title?: string
  description?: string
  artifactType?: ArtifactType
  topics?: string[]
}

/** Library signals read from bundle sidecars, never from the spec. */
export interface ArtifactSignals {
  /** Count of annotation threads whose status is "open". */
  openThreads: number
  /** First message of the newest open thread, trimmed to one line. */
  openExcerpt?: string
  /** True when publish.json says the bundle is published. */
  published: boolean
}

export interface ProjectIndexEntry {
  name: string
  artifactCount: number
  lastModifiedAt: string
}

export interface ArtifactIndexEntry extends ArtifactSignals {
  slug: string
  title?: string
  description?: string
  artifactType?: ArtifactType
  topics?: string[]
  modifiedAt: string
  project: string
}

export interface ArtifactListEntry extends ArtifactSignals {
  slug: string
  title?: string
  description?: string
  artifactType?: ArtifactType
  topics?: string[]
  modifiedAt: string
}

function isArtifactType(value: unknown): value is ArtifactType {
  return typeof value === "string" && ARTIFACT_TYPES.some((type) => type === value)
}

export async function readArtifactMeta(filePath: string): Promise<ArtifactMeta> {
  try {
    const raw = await readFile(filePath, "utf8")
    const parsed = JSON.parse(raw)
    return {
      title: typeof parsed.title === "string" && parsed.title.length > 0 ? parsed.title : undefined,
      description: typeof parsed.description === "string" && parsed.description.length > 0 ? parsed.description : undefined,
      artifactType: isArtifactType(parsed.artifactType) ? parsed.artifactType : undefined,
      topics: Array.isArray(parsed.topics)
        ? parsed.topics.filter((topic: unknown): topic is string => typeof topic === "string" && topic.length > 0)
        : undefined,
    }
  } catch {
    return {}
  }
}

const EXCERPT_MAX = 80

async function readJson(filePath: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(filePath, "utf8"))
  } catch {
    return undefined
  }
}

/** Open comments and publish state for one bundle. Missing or broken sidecars count as none. */
export async function readArtifactSignals(bundleDir: string): Promise<ArtifactSignals> {
  const annotations = await readJson(join(bundleDir, BUNDLE_FILES.annotations))
  const publish = await readJson(join(bundleDir, BUNDLE_FILES.publish))
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

/**
 * List artifacts in a project directory using the bundle layout.
 *
 * Each immediate child directory that contains an `artifact.json` file is
 * treated as one artifact. Flat `<slug>.json` files are ignored.
 */
export async function listProjectArtifacts(projectDir: string): Promise<ArtifactListEntry[]> {
  const artifacts: ArtifactListEntry[] = []
  try {
    const entries = await readdir(projectDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const slug = entry.name
      if (!isKebabCase(slug)) continue
      const artifactJson = join(projectDir, slug, BUNDLE_FILES.artifact)
      if (!(await fileExists(artifactJson))) continue
      const stats = await stat(artifactJson)
      const meta = await readArtifactMeta(artifactJson)
      const signals = await readArtifactSignals(join(projectDir, slug))
      artifacts.push({
        ...signals,
        slug,
        title: meta.title,
        description: meta.description,
        artifactType: meta.artifactType,
        topics: meta.topics,
        modifiedAt: stats.mtime.toISOString(),
      })
    }
  } catch (error: any) {
    if (error.code !== "ENOENT") throw error
  }
  artifacts.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
  return artifacts
}

/**
 * Scan the entire artifacts directory for projects and artifacts.
 */
export async function scanArtifacts(
  artifactsDir: string,
): Promise<{ projects: ProjectIndexEntry[]; artifacts: ArtifactIndexEntry[] }> {
  const projects: ProjectIndexEntry[] = []
  const allArtifacts: ArtifactIndexEntry[] = []

  try {
    const entries = await readdir(artifactsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const projectName = entry.name
      if (!isKebabCase(projectName)) continue
      const projectDir = join(artifactsDir, projectName)
      const projectArtifacts = await listProjectArtifacts(projectDir)
      if (projectArtifacts.length === 0) continue

      projects.push({
        name: projectName,
        artifactCount: projectArtifacts.length,
        lastModifiedAt: projectArtifacts[0].modifiedAt,
      })
      allArtifacts.push(...projectArtifacts.map((artifact) => ({ ...artifact, project: projectName })))
    }
  } catch (error: any) {
    if (error.code !== "ENOENT") throw error
  }

  projects.sort((a, b) => new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime())
  allArtifacts.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())

  return { projects, artifacts: allArtifacts }
}
