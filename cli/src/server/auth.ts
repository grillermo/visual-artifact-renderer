import { createHash } from "node:crypto"
import { AuthStore, MAX_CLIENTS, OTP_TTL_MS, SESSION_TTL_MS } from "./auth-store.ts"
import { consentPage, errorPage, loginPage } from "./auth-pages.ts"

/**
 * OAuth 2.1 authorization server + Slack OTP login for a single user.
 *
 * MCP clients (Claude Code, claude.ai) discover it through the protected
 * resource metadata, register with RFC 7591 dynamic client registration, send
 * the user through /oauth/authorize (PKCE S256 only), and trade the code at
 * /oauth/token. The user proves who they are with a 6-digit code posted to
 * their Slack, which also signs the browser in for the renderer pages.
 */

export const SESSION_COOKIE = "var_session"
export const MCP_PATH = "/mcp"
export const AUTH_ROOT_SEGMENTS = [".well-known", "oauth", "login", "logout", "mcp"] as const

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"])
/** claude.ai / Claude Desktop connectors redirect here instead of to loopback. */
const HOSTED_CALLBACKS = new Set([
  "https://claude.ai/api/mcp/auth_callback",
  "https://claude.com/api/mcp/auth_callback",
])
const FORM_MAX_BYTES = 16 * 1024

export type OtpSender = (code: string) => Promise<void>

export interface AuthOptions {
  store: AuthStore
  /** Public origin the server is reached at, e.g. https://var.chiq.me. The OAuth issuer. */
  publicUrl: string
  sendOtp: OtpSender
}

export function slackOtpSender(webhookUrl: string, publicUrl: string): OtpSender {
  const host = new URL(publicUrl).host
  return async (code) => {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `Your OTP for ${host} ${code}` }),
    })
    if (!response.ok) throw new Error(`Slack webhook answered ${response.status}`)
  }
}

export function isAllowedRedirectUri(uri: string): boolean {
  if (HOSTED_CALLBACKS.has(uri)) return true
  let parsed: URL
  try {
    parsed = new URL(uri)
  } catch {
    return false
  }
  return parsed.protocol === "http:" && LOOPBACK_HOSTS.has(parsed.hostname) && !parsed.username && !parsed.password && !parsed.hash
}

/** Only same-site relative paths, so return_to can't bounce the user elsewhere. */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/"
  return value
}

function s256(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url")
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  })
}

function html(body: string, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self' http: https:; frame-ancestors 'none'",
      ...headers,
    },
  })
}

function redirect(location: string, headers: Record<string, string> = {}): Response {
  return new Response(null, { status: 303, headers: { Location: location, "Cache-Control": "no-store", ...headers } })
}

function oauthError(error: string, description: string, status = 400): Response {
  return json({ error, error_description: description }, status)
}

async function readParams(req: Request): Promise<URLSearchParams | null> {
  const length = Number(req.headers.get("content-length") ?? "0")
  if (length > FORM_MAX_BYTES) return null
  const text = await req.text()
  if (text.length > FORM_MAX_BYTES) return null
  const type = req.headers.get("content-type") ?? ""
  if (type.includes("application/json")) {
    try {
      const body = JSON.parse(text) as Record<string, unknown>
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(body)) {
        if (typeof value === "string") params.set(key, value)
      }
      return params
    } catch {
      return null
    }
  }
  return new URLSearchParams(text)
}

function cookieValue(req: Request, name: string): string | null {
  const header = req.headers.get("cookie")
  if (!header) return null
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=")
    if (key === name) return rest.join("=")
  }
  return null
}

function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization")
  const match = header?.match(/^Bearer\s+(\S+)$/i)
  return match ? match[1] : null
}

export class AuthServer {
  private readonly store: AuthStore
  private readonly issuer: string
  private readonly sendOtp: OtpSender
  private readonly secureCookies: boolean

  constructor(options: AuthOptions) {
    this.store = options.store
    this.issuer = new URL(options.publicUrl).origin
    this.sendOtp = options.sendOtp
    this.secureCookies = this.issuer.startsWith("https:")
  }

  get publicUrl(): string {
    return this.issuer
  }

  get resource(): string {
    return `${this.issuer}${MCP_PATH}`
  }

  /** A short-lived renderer session for server-side captures; call the cleanup when done. */
  temporarySession(): [string, () => void] {
    const session = this.store.createSession()
    return [session, () => this.store.deleteSession(session)]
  }

  sessionValid(req: Request): boolean {
    const session = cookieValue(req, SESSION_COOKIE)
    return !!session && this.store.sessionValid(session)
  }

  bearerValid(req: Request): boolean {
    const token = bearerToken(req)
    return !!token && this.store.accessTokenValid(token)
  }

  /** 401 that tells an MCP client where to start the OAuth flow (RFC 9728). */
  mcpUnauthorized(): Response {
    return json({ error: "invalid_token", error_description: "Sign in with OAuth to use this MCP server" }, 401, {
      "WWW-Authenticate": `Bearer resource_metadata="${this.issuer}/.well-known/oauth-protected-resource"`,
    })
  }

  /**
   * Browser navigations go to the login page; everything else gets a 401.
   * HEAD redirects too, so `create`'s "is the renderer up?" probe still sees 200.
   */
  browserUnauthorized(req: Request, url: URL): Response {
    const accept = req.headers.get("accept") ?? ""
    if (req.method === "HEAD" || (req.method === "GET" && accept.includes("text/html"))) {
      return redirect(`/login?return_to=${encodeURIComponent(url.pathname + url.search)}`)
    }
    return json({ error: "unauthorized", error_description: "Sign in at /login" }, 401)
  }

  /** Handles the auth routes; returns null for every other path. */
  async handle(req: Request, url: URL): Promise<Response | null> {
    const path = url.pathname
    const method = req.method

    if (path === "/.well-known/oauth-protected-resource" || path === `/.well-known/oauth-protected-resource${MCP_PATH}`) {
      return json({
        resource: this.resource,
        authorization_servers: [this.issuer],
        scopes_supported: ["mcp"],
        bearer_methods_supported: ["header"],
        resource_name: "Visual Artifact Renderer",
      })
    }
    if (path === "/.well-known/oauth-authorization-server" || path === "/.well-known/openid-configuration") {
      return json({
        issuer: this.issuer,
        authorization_endpoint: `${this.issuer}/oauth/authorize`,
        token_endpoint: `${this.issuer}/oauth/token`,
        registration_endpoint: `${this.issuer}/oauth/register`,
        scopes_supported: ["mcp"],
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        code_challenge_methods_supported: ["S256"],
        token_endpoint_auth_methods_supported: ["none"],
      })
    }
    if (path.startsWith("/.well-known/")) return new Response("Not found", { status: 404 })

    if (path === "/oauth/register") return method === "POST" ? this.register(req) : methodNotAllowed("POST")
    if (path === "/oauth/authorize") {
      if (method === "GET") return this.authorizeForm(req, url)
      if (method === "POST") return this.authorizeDecision(req)
      return methodNotAllowed("GET, POST")
    }
    if (path === "/oauth/token") return method === "POST" ? this.token(req) : methodNotAllowed("POST")
    if (path.startsWith("/oauth/")) return new Response("Not found", { status: 404 })

    if (path === "/login") {
      if (method === "GET") return this.loginForm(req, url)
      if (method === "POST") return this.sendCode(req)
      return methodNotAllowed("GET, POST")
    }
    if (path === "/login/verify") return method === "POST" ? this.verifyCode(req) : methodNotAllowed("POST")
    if (path === "/logout") return method === "POST" ? this.logout(req) : methodNotAllowed("POST")

    return null
  }

  // Cross-site POSTs to the login, consent and logout forms are refused.
  private sameOrigin(req: Request): boolean {
    const origin = req.headers.get("origin")
    if (origin) return origin === this.issuer
    const site = req.headers.get("sec-fetch-site")
    return !site || site === "same-origin" || site === "none"
  }

  // RFC 7591

  private async register(req: Request): Promise<Response> {
    let body: Record<string, unknown>
    try {
      const text = await req.text()
      if (text.length > FORM_MAX_BYTES) return oauthError("invalid_client_metadata", "Registration body too large")
      body = JSON.parse(text) as Record<string, unknown>
    } catch {
      return oauthError("invalid_client_metadata", "Body must be JSON")
    }
    const redirectUris = Array.isArray(body.redirect_uris)
      ? body.redirect_uris.filter((uri): uri is string => typeof uri === "string" && uri.length > 0)
      : []
    if (redirectUris.length === 0 || redirectUris.length > 10 || !redirectUris.every(isAllowedRedirectUri)) {
      return oauthError(
        "invalid_redirect_uri",
        "redirect_uris must be loopback http URLs or a claude.ai MCP callback",
      )
    }
    if (body.token_endpoint_auth_method !== undefined && body.token_endpoint_auth_method !== "none") {
      return oauthError("invalid_client_metadata", "Only public clients (token_endpoint_auth_method none) are supported")
    }
    if (this.store.clientCount() >= MAX_CLIENTS) {
      return oauthError("invalid_client_metadata", "Too many registered clients", 429)
    }
    const name = typeof body.client_name === "string" && body.client_name.trim() ? body.client_name.trim().slice(0, 100) : "MCP client"
    const client = this.store.registerClient(name, redirectUris)
    return json(
      {
        client_id: client.clientId,
        client_id_issued_at: Math.floor(client.createdAt / 1000),
        client_name: client.name,
        redirect_uris: client.redirectUris,
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
      },
      201,
    )
  }

  // Authorization endpoint

  private authorizeRequest(params: URLSearchParams):
    | { ok: true; clientId: string; clientName: string; redirectUri: string; state: string | null; codeChallenge: string; resource: string | null }
    | { ok: false; response: Response } {
    const clientId = params.get("client_id") ?? ""
    const client = clientId ? this.store.findClient(clientId) : null
    if (!client) return { ok: false, response: html(errorPage("Unknown client", "This app is not registered. Reconnect it and try again."), 400) }
    const redirectUri = params.get("redirect_uri") ?? (client.redirectUris.length === 1 ? client.redirectUris[0] : "")
    if (!client.redirectUris.includes(redirectUri)) {
      return { ok: false, response: html(errorPage("Bad redirect", "The redirect URI does not match this app's registration."), 400) }
    }

    // From here on, errors go back to the client as RFC 6749 redirects.
    const state = params.get("state")
    const fail = (error: string, description: string): { ok: false; response: Response } => {
      const target = new URL(redirectUri)
      target.searchParams.set("error", error)
      target.searchParams.set("error_description", description)
      if (state) target.searchParams.set("state", state)
      target.searchParams.set("iss", this.issuer)
      return { ok: false, response: redirect(target.toString()) }
    }
    if (params.get("response_type") !== "code") return fail("unsupported_response_type", "response_type must be code")
    const codeChallenge = params.get("code_challenge") ?? ""
    if (params.get("code_challenge_method") !== "S256" || !/^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge)) {
      return fail("invalid_request", "PKCE with code_challenge_method S256 is required")
    }
    const resource = params.get("resource")
    if (resource && resource !== this.resource && resource !== this.issuer && resource !== `${this.issuer}/`) {
      return fail("invalid_target", `resource must be ${this.resource}`)
    }
    return { ok: true, clientId, clientName: client.name, redirectUri, state, codeChallenge, resource }
  }

  private authorizeForm(req: Request, url: URL): Response {
    const request = this.authorizeRequest(url.searchParams)
    if (!request.ok) return request.response
    if (!this.sessionValid(req)) return redirect(`/login?return_to=${encodeURIComponent(url.pathname + url.search)}`)
    return html(consentPage(request.clientName, request.redirectUri, url.searchParams))
  }

  private async authorizeDecision(req: Request): Promise<Response> {
    if (!this.sameOrigin(req)) return html(errorPage("Forbidden", "Cross-site form submission refused."), 403)
    const params = await readParams(req)
    if (!params) return html(errorPage("Bad request", "Could not read the form."), 400)
    const request = this.authorizeRequest(params)
    if (!request.ok) return request.response
    if (!this.sessionValid(req)) return redirect(`/login?return_to=${encodeURIComponent(`/oauth/authorize?${params}`)}`)

    const target = new URL(request.redirectUri)
    if (params.get("decision") !== "approve") {
      target.searchParams.set("error", "access_denied")
      target.searchParams.set("error_description", "The user denied access")
    } else {
      const code = this.store.issueCode({
        clientId: request.clientId,
        redirectUri: request.redirectUri,
        codeChallenge: request.codeChallenge,
        resource: request.resource,
      })
      target.searchParams.set("code", code)
    }
    if (request.state) target.searchParams.set("state", request.state)
    target.searchParams.set("iss", this.issuer)
    return redirect(target.toString())
  }

  // Token endpoint

  private async token(req: Request): Promise<Response> {
    const params = await readParams(req)
    if (!params) return oauthError("invalid_request", "Could not read the request body")
    const grantType = params.get("grant_type")
    const clientId = params.get("client_id") ?? ""

    if (grantType === "authorization_code") {
      const code = params.get("code") ?? ""
      const verifier = params.get("code_verifier") ?? ""
      const grant = code ? this.store.consumeCode(code) : null
      if (!grant) return oauthError("invalid_grant", "Unknown, used or expired authorization code")
      if (grant.clientId !== clientId) return oauthError("invalid_grant", "Code was issued to another client")
      const redirectUri = params.get("redirect_uri")
      if (redirectUri && redirectUri !== grant.redirectUri) return oauthError("invalid_grant", "redirect_uri does not match")
      if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) || s256(verifier) !== grant.codeChallenge) {
        return oauthError("invalid_grant", "PKCE verification failed")
      }
      return this.tokenResponse(this.store.issueTokens(clientId))
    }

    if (grantType === "refresh_token") {
      const refreshToken = params.get("refresh_token") ?? ""
      const pair = refreshToken ? this.store.rotateRefreshToken(refreshToken, clientId) : null
      if (!pair) return oauthError("invalid_grant", "Unknown or expired refresh token")
      return this.tokenResponse(pair)
    }

    return oauthError("unsupported_grant_type", "grant_type must be authorization_code or refresh_token")
  }

  private tokenResponse(pair: { accessToken: string; refreshToken: string; expiresIn: number }): Response {
    return json({
      access_token: pair.accessToken,
      token_type: "Bearer",
      expires_in: pair.expiresIn,
      refresh_token: pair.refreshToken,
      scope: "mcp",
    })
  }

  // Slack OTP login

  private loginForm(req: Request, url: URL): Response {
    const returnTo = safeReturnTo(url.searchParams.get("return_to"))
    if (this.sessionValid(req)) return redirect(returnTo)
    return html(
      loginPage({
        returnTo,
        sent: url.searchParams.get("sent") === "1",
        error: url.searchParams.get("error"),
        waitSeconds: Math.ceil(this.store.otpWaitMs() / 1000),
        ttlMinutes: OTP_TTL_MS / 60000,
      }),
    )
  }

  private loginUrl(returnTo: string, extra: Record<string, string>): string {
    const params = new URLSearchParams({ return_to: returnTo, ...extra })
    return `/login?${params}`
  }

  private async sendCode(req: Request): Promise<Response> {
    if (!this.sameOrigin(req)) return html(errorPage("Forbidden", "Cross-site form submission refused."), 403)
    const params = await readParams(req)
    const returnTo = safeReturnTo(params?.get("return_to"))
    if (this.store.otpWaitMs() > 0) return redirect(this.loginUrl(returnTo, { sent: "1", error: "wait" }))
    const code = this.store.issueOtp()
    try {
      await this.sendOtp(code)
    } catch (error) {
      console.error(`[auth] could not send the OTP to Slack: ${error instanceof Error ? error.message : String(error)}`)
      return redirect(this.loginUrl(returnTo, { error: "send" }))
    }
    return redirect(this.loginUrl(returnTo, { sent: "1" }))
  }

  private async verifyCode(req: Request): Promise<Response> {
    if (!this.sameOrigin(req)) return html(errorPage("Forbidden", "Cross-site form submission refused."), 403)
    const params = await readParams(req)
    const returnTo = safeReturnTo(params?.get("return_to"))
    const code = (params?.get("code") ?? "").replace(/\s+/g, "")
    const result = this.store.checkOtp(code)
    if (result !== "ok") return redirect(this.loginUrl(returnTo, { sent: result === "invalid" ? "1" : "0", error: result }))
    const session = this.store.createSession()
    return redirect(returnTo, { "Set-Cookie": this.sessionCookie(session, SESSION_TTL_MS / 1000) })
  }

  private async logout(req: Request): Promise<Response> {
    if (!this.sameOrigin(req)) return html(errorPage("Forbidden", "Cross-site form submission refused."), 403)
    const session = cookieValue(req, SESSION_COOKIE)
    if (session) this.store.deleteSession(session)
    return redirect("/login", { "Set-Cookie": this.sessionCookie("", 0) })
  }

  private sessionCookie(value: string, maxAge: number): string {
    return `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${this.secureCookies ? "; Secure" : ""}`
  }
}

function methodNotAllowed(allow: string): Response {
  return json({ error: "Method not allowed" }, 405, { Allow: allow })
}
