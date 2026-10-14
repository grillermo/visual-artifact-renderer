import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { RAW_ARTIFACT_MAX_BYTES, preflightArtifactSpec } from "@agents/visual-artifact-annotations/contract"
import { loadContract } from "../contract.ts"
import { printSummary } from "../commands/contract.ts"
import { artifactJsonPath, assetsDirPath, bundleDirPath, isInsideArtifactsDir, parseBundleRoute, parseProjectRoute } from "../lib/paths.ts"
import { listProjectArtifacts, scanArtifacts } from "../lib/scan.ts"
import { validateMermaidNodes } from "../mermaid.ts"
import { ensureDir, fileExists } from "../util.ts"
import { validateSpec, ValidationError } from "../validate.ts"
import authoringGuide from "../../../skill/SKILL.md" with { type: "text" }

/**
 * Remote MCP server (Streamable HTTP, stateless JSON responses) so Claude on
 * any machine can create and read artifacts on this server without the CLI.
 * Callers are authenticated before this runs; see AuthServer.bearerValid.
 */

export const MCP_BODY_MAX_BYTES = RAW_ARTIFACT_MAX_BYTES + 64 * 1024

const PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"]
const SERVER_INFO = { name: "visual-artifact", title: "Visual Artifact Renderer", version: "1.0.1" }
const INSTRUCTIONS =
  "Publish visual artifacts (rendered pages built from a constrained JSON spec) and read them back. " +
  "Before writing a spec, call get_authoring_guide once for the design rules and get_artifact_contract for node props. " +
  "create_visual_artifact returns the page URL; give it to the user."

/** Node types whose `src` makes the CLI read a file from disk. Remote callers must inline content. */
const DISK_SOURCE_NODE_TYPES = new Set(["file-tree", "code", "walkthrough", "execution-trace"])

export interface McpContext {
  artifactsDir: string
  publicUrl: string
  contractPath?: string
}

interface JsonRpcRequest {
  jsonrpc: "2.0"
  id?: string | number | null
  method: string
  params?: Record<string, unknown>
}

class ToolError extends Error {}

const TOOLS = [
  {
    name: "get_authoring_guide",
    title: "Authoring guide",
    description: "The visual-artifact design rules, node catalog and page recipes. Read before writing a spec.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: "get_artifact_contract",
    title: "Artifact contract",
    description:
      "The JSON contract specs are validated against. With no arguments, a summary of spec constraints and node types; " +
      "with `node`, the full props schema of that node type; with format 'json', the whole contract.",
    inputSchema: {
      type: "object",
      properties: {
        node: { type: "string", description: "Node type to describe, e.g. chapter, code, steps" },
        format: { type: "string", enum: ["summary", "json"], description: "summary (default) or json" },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "validate_visual_artifact",
    title: "Validate artifact",
    description: "Validate a VisualArtifactSpec without saving it. Returns the errors, if any.",
    inputSchema: {
      type: "object",
      properties: { spec: { type: "object", description: "The VisualArtifactSpec JSON object" } },
      required: ["spec"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "create_visual_artifact",
    title: "Create artifact",
    description:
      "Validate and save a VisualArtifactSpec under a project, replacing any artifact with the same project and slug, " +
      "and return its URL. Inline all code and file content: `src` paths on code, walkthrough, file-tree and " +
      "execution-trace nodes are not read on this server.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string", description: "kebab-case project name, usually the repository name" },
        spec: { type: "object", description: "The VisualArtifactSpec JSON object" },
      },
      required: ["project", "spec"],
      additionalProperties: false,
    },
    annotations: { destructiveHint: false, idempotentHint: true },
  },
  {
    name: "get_visual_artifact",
    title: "Get artifact",
    description: "Read back the saved spec of an artifact, e.g. to revise and re-create it.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string", description: "kebab-case project name" },
        slug: { type: "string", description: "kebab-case artifact slug" },
      },
      required: ["project", "slug"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "list_visual_artifacts",
    title: "List artifacts",
    description: "List projects and their artifacts, newest first, with URLs. Pass `project` to list one project.",
    inputSchema: {
      type: "object",
      properties: { project: { type: "string", description: "kebab-case project name" } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
]

function rpcResult(id: JsonRpcRequest["id"], result: unknown): Record<string, unknown> {
  return { jsonrpc: "2.0", id: id ?? null, result }
}

function rpcError(id: JsonRpcRequest["id"], code: number, message: string): Record<string, unknown> {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } }
}

function textResult(text: string, structuredContent?: Record<string, unknown>, isError = false): Record<string, unknown> {
  return {
    content: [{ type: "text", text }],
    ...(structuredContent ? { structuredContent } : {}),
    ...(isError ? { isError: true } : {}),
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  })
}

/** Paths of `src` strings inside the props of disk-reading node types (an image's src is fine). */
export function findDiskSources(nodes: unknown): string[] {
  const found: string[] = []
  const walkProps = (value: unknown, at: string): void => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => walkProps(item, `${at}[${index}]`))
      return
    }
    if (!value || typeof value !== "object") return
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key === "src" && typeof child === "string") found.push(`${at}.src`)
      else walkProps(child, `${at}.${key}`)
    }
  }
  const walkNodes = (value: unknown, at: string): void => {
    if (!Array.isArray(value)) return
    value.forEach((node, index) => {
      if (!node || typeof node !== "object") return
      const obj = node as Record<string, unknown>
      const here = `${at}[${index}]`
      if (typeof obj.type === "string" && DISK_SOURCE_NODE_TYPES.has(obj.type)) walkProps(obj.props, `${here}.props`)
      walkNodes(obj.children, `${here}.children`)
    })
  }
  walkNodes(nodes, "nodes")
  return found
}

async function checkSpec(spec: unknown): Promise<{ slug: string; totalNodes: number; serialized: string }> {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) throw new ToolError("spec must be a JSON object")
  const diskSources = findDiskSources((spec as Record<string, unknown>).nodes)
  if (diskSources.length > 0) {
    throw new ToolError(
      `Remote specs can't read files from disk. Inline the content instead of src at: ${diskSources.slice(0, 5).join(", ")}`,
    )
  }
  const parsed = validateSpec(spec)
  await validateMermaidNodes(parsed)
  const serialized = `${JSON.stringify(spec, null, 2)}\n`
  if (Buffer.byteLength(serialized, "utf8") > RAW_ARTIFACT_MAX_BYTES) {
    throw new ToolError(`Artifact exceeds ${RAW_ARTIFACT_MAX_BYTES} bytes`)
  }
  const { result } = preflightArtifactSpec(spec)
  return { slug: parsed.slug, totalNodes: result.totalNodes, serialized }
}

function stringArg(args: Record<string, unknown>, key: string): string {
  const value = args[key]
  if (typeof value !== "string" || !value) throw new ToolError(`${key} is required`)
  return value
}

async function callTool(name: string, args: Record<string, unknown>, ctx: McpContext): Promise<Record<string, unknown>> {
  const artifactUrl = (project: string, slug: string): string => `${ctx.publicUrl}/${project}/${slug}/`

  switch (name) {
    case "get_authoring_guide":
      return textResult(authoringGuide)

    case "get_artifact_contract": {
      const contract = await loadContract(ctx.contractPath)
      if (typeof args.node === "string" && args.node) {
        const def = contract.nodes[args.node]
        if (!def) throw new ToolError(`Unknown node type: ${args.node}. Known: ${contract.nodeTypes.join(", ")}`)
        return textResult(JSON.stringify({ type: args.node, ...def }, null, 2))
      }
      if (args.format === "json") return textResult(JSON.stringify(contract, null, 2))
      return textResult(printSummary(contract))
    }

    case "validate_visual_artifact": {
      const { slug, totalNodes } = await checkSpec(args.spec)
      return textResult(`Valid: ${slug} (${totalNodes} nodes)`, { ok: true, slug, totalNodes })
    }

    case "create_visual_artifact": {
      const project = stringArg(args, "project")
      if (!parseProjectRoute(project)) throw new ToolError("project must be a kebab-case name, not a reserved one (api, data, mcp, ...)")
      const { slug, totalNodes, serialized } = await checkSpec(args.spec)
      const route = parseBundleRoute(project, slug)
      if (!route) throw new ToolError(`slug ${slug} is reserved; pick another`)
      const filePath = artifactJsonPath(ctx.artifactsDir, project, slug)
      if (!isInsideArtifactsDir(filePath, ctx.artifactsDir)) throw new ToolError("Invalid project or slug")
      await ensureDir(bundleDirPath(ctx.artifactsDir, project, slug))
      await ensureDir(assetsDirPath(ctx.artifactsDir, project, slug))
      await writeFile(filePath, serialized, "utf8")
      const url = artifactUrl(project, slug)
      return textResult(`Created ${url}`, { ok: true, project, slug, url, totalNodes })
    }

    case "get_visual_artifact": {
      const route = parseBundleRoute(stringArg(args, "project"), stringArg(args, "slug"))
      if (!route) throw new ToolError("project and slug must be kebab-case names")
      const filePath = artifactJsonPath(ctx.artifactsDir, route.project, route.slug)
      if (!isInsideArtifactsDir(filePath, ctx.artifactsDir) || !(await fileExists(filePath))) {
        throw new ToolError(`No artifact ${route.project}/${route.slug}`)
      }
      return textResult(await readFile(filePath, "utf8"))
    }

    case "list_visual_artifacts": {
      if (typeof args.project === "string" && args.project) {
        const route = parseProjectRoute(args.project)
        if (!route) throw new ToolError("project must be a kebab-case name")
        const projectDir = resolve(ctx.artifactsDir, route.project)
        if (!isInsideArtifactsDir(projectDir, ctx.artifactsDir)) throw new ToolError("Invalid project")
        const artifacts = (await listProjectArtifacts(projectDir)).map((artifact) => ({
          slug: artifact.slug,
          title: artifact.title,
          modifiedAt: artifact.modifiedAt,
          url: artifactUrl(route.project, artifact.slug),
        }))
        return textResult(JSON.stringify({ project: route.project, artifacts }, null, 2), { project: route.project, artifacts })
      }
      const { projects, artifacts } = await scanArtifacts(ctx.artifactsDir)
      const listed = artifacts.map((artifact) => ({
        project: artifact.project,
        slug: artifact.slug,
        title: artifact.title,
        modifiedAt: artifact.modifiedAt,
        url: artifactUrl(artifact.project, artifact.slug),
      }))
      return textResult(JSON.stringify({ projects, artifacts: listed }, null, 2), { projects, artifacts: listed })
    }

    default:
      throw new ToolError(`Unknown tool: ${name}`)
  }
}

async function dispatch(message: JsonRpcRequest, ctx: McpContext): Promise<Record<string, unknown> | null> {
  const isNotification = message.id === undefined
  switch (message.method) {
    case "initialize": {
      const requested = typeof message.params?.protocolVersion === "string" ? message.params.protocolVersion : ""
      return rpcResult(message.id, {
        protocolVersion: PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      })
    }
    case "ping":
      return rpcResult(message.id, {})
    case "tools/list":
      return rpcResult(message.id, { tools: TOOLS })
    case "tools/call": {
      const name = typeof message.params?.name === "string" ? message.params.name : ""
      const args = (message.params?.arguments ?? {}) as Record<string, unknown>
      if (!TOOLS.some((tool) => tool.name === name)) return rpcError(message.id, -32602, `Unknown tool: ${name}`)
      try {
        return rpcResult(message.id, await callTool(name, args, ctx))
      } catch (error) {
        if (error instanceof ToolError || error instanceof ValidationError) {
          return rpcResult(message.id, textResult(error.message, undefined, true))
        }
        const text = error instanceof Error ? error.message : String(error)
        return rpcResult(message.id, textResult(`Failed: ${text}`, undefined, true))
      }
    }
    default:
      if (isNotification) return null
      return rpcError(message.id, -32601, `Method not found: ${message.method}`)
  }
}

export async function handleMcp(req: Request, ctx: McpContext): Promise<Response> {
  if (req.method === "GET" || req.method === "DELETE") {
    return new Response(null, { status: 405, headers: { Allow: "POST" } })
  }
  if (req.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST" } })

  const length = Number(req.headers.get("content-length") ?? "0")
  if (length > MCP_BODY_MAX_BYTES) return jsonResponse(rpcError(null, -32600, "Request too large"), 413)
  let body: unknown
  try {
    const text = await req.text()
    if (Buffer.byteLength(text, "utf8") > MCP_BODY_MAX_BYTES) return jsonResponse(rpcError(null, -32600, "Request too large"), 413)
    body = JSON.parse(text)
  } catch {
    return jsonResponse(rpcError(null, -32700, "Parse error"), 400)
  }

  const messages = Array.isArray(body) ? body : [body]
  if (messages.length === 0) return jsonResponse(rpcError(null, -32600, "Empty batch"), 400)
  const responses: Record<string, unknown>[] = []
  for (const message of messages) {
    if (!message || typeof message !== "object" || (message as JsonRpcRequest).jsonrpc !== "2.0" || typeof (message as JsonRpcRequest).method !== "string") {
      // A JSON-RPC response or garbage; responses from the client need no reply.
      if (message && typeof message === "object" && ("result" in message || "error" in message)) continue
      responses.push(rpcError(null, -32600, "Invalid request"))
      continue
    }
    const response = await dispatch(message as JsonRpcRequest, ctx)
    if (response) responses.push(response)
  }

  if (responses.length === 0) return new Response(null, { status: 202 })
  return jsonResponse(Array.isArray(body) ? responses : responses[0])
}
