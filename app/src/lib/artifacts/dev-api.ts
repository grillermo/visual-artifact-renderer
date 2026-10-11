import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { resolve } from "node:path"
import { annotationMutationRequestRejection } from "@agents/visual-artifact-annotations"
import {
  ArtifactNotFoundError,
  mutateAnnotationsDocument,
  parseAnnotationMutationsPayload,
  readAnnotationsDocument,
  resolveLocalAuthor,
} from "../../../../cli/src/lib/annotations"
import { parseBundleRoute } from "../../../../cli/src/lib/paths"
import { readAnnotationMutationBody } from "../../../../cli/src/lib/annotation-body"

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
  const api = pathname.match(/^\/api\/annotations\/([^/]+)\/([^/]+)$/)
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
