import { homedir } from "node:os"
import { resolve } from "node:path"
import { AuthServer, MCP_PATH, slackOtpSender } from "./auth.ts"
import { AuthStore } from "./auth-store.ts"
import type { Exporter } from "./export.ts"
import { handleMcp, type McpContext } from "./mcp.ts"

/**
 * Request gate for `serve --auth`: auth routes answer themselves, /mcp needs
 * an OAuth bearer token, and everything else needs a signed-in browser
 * session. Returns null when the request may continue to the renderer.
 */
export async function gateRequest(
  auth: AuthServer,
  req: Request,
  url: URL,
  mcp: McpContext,
  passthroughPaths: readonly string[] = [],
  exporter?: Exporter,
): Promise<Response | null> {
  const authResponse = await auth.handle(req, url)
  if (authResponse) return authResponse

  // Exported files are reached by their unguessable link, without a session.
  const exportResponse = exporter ? await exporter.serve(url.pathname) : null
  if (exportResponse) return exportResponse

  if (url.pathname === MCP_PATH) {
    if (!auth.bearerValid(req)) return auth.mcpUnauthorized()
    return handleMcp(req, mcp)
  }

  if (passthroughPaths.includes(url.pathname)) return null
  if (!auth.sessionValid(req)) return auth.browserUnauthorized(req, url)
  return null
}

export class AuthConfigError extends Error {}

export interface AuthEnv {
  publicUrl: string
  webhookUrl: string
  dbPath: string
}

/** Reads the auth settings from the environment; throws AuthConfigError when one is missing. */
export function authEnv(env: NodeJS.ProcessEnv = process.env): AuthEnv {
  const publicUrl = env.VISUAL_ARTIFACT_PUBLIC_URL?.trim()
  const webhookUrl = env.VISUAL_ARTIFACT_SLACK_OTP_WEBHOOK_URL?.trim()
  if (!publicUrl) throw new AuthConfigError("--auth needs VISUAL_ARTIFACT_PUBLIC_URL (e.g. https://var.example.com)")
  if (!webhookUrl) throw new AuthConfigError("--auth needs VISUAL_ARTIFACT_SLACK_OTP_WEBHOOK_URL (a Slack incoming webhook)")
  try {
    const parsed = new URL(publicUrl)
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
      throw new AuthConfigError("VISUAL_ARTIFACT_PUBLIC_URL must be https (or a localhost URL for testing)")
    }
  } catch (error) {
    if (error instanceof AuthConfigError) throw error
    throw new AuthConfigError(`VISUAL_ARTIFACT_PUBLIC_URL is not a URL: ${publicUrl}`)
  }
  const dbPath = env.VISUAL_ARTIFACT_AUTH_DB?.trim() || resolve(homedir(), ".local", "share", "visual-artifact", "auth.sqlite")
  return { publicUrl: new URL(publicUrl).origin, webhookUrl, dbPath }
}

export function createAuthServer(settings: AuthEnv): AuthServer {
  return new AuthServer({
    store: new AuthStore(settings.dbPath),
    publicUrl: settings.publicUrl,
    sendOtp: slackOtpSender(settings.webhookUrl, settings.publicUrl),
  })
}
