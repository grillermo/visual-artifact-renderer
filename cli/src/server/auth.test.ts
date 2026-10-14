import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { AuthServer, isAllowedRedirectUri, safeReturnTo, SESSION_COOKIE } from "./auth.ts"
import { AuthStore, OTP_MAX_ATTEMPTS, OTP_RESEND_INTERVAL_MS } from "./auth-store.ts"
import { gateRequest } from "./gate.ts"
import { findDiskSources } from "./mcp.ts"

const ORIGIN = "https://var.example.com"
const REDIRECT = "http://localhost:43123/callback"

let now = 1_800_000_000_000
let sent: string[] = []
let store: AuthStore
let auth: AuthServer
let artifactsDir: string

beforeEach(async () => {
  now = 1_800_000_000_000
  sent = []
  store = new AuthStore(":memory:", () => now)
  auth = new AuthServer({ store, publicUrl: ORIGIN, sendOtp: async (code) => { sent.push(code) } })
  artifactsDir = await mkdtemp(join(tmpdir(), "var-auth-"))
})

afterEach(async () => {
  store.close()
  await rm(artifactsDir, { recursive: true, force: true })
})

async function request(path: string, init: RequestInit & { cookie?: string; bearer?: string } = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  if (init.cookie) headers.set("cookie", `${SESSION_COOKIE}=${init.cookie}`)
  if (init.bearer) headers.set("authorization", `Bearer ${init.bearer}`)
  if (init.method === "POST" && !headers.has("origin")) headers.set("origin", ORIGIN)
  const req = new Request(`${ORIGIN}${path}`, { ...init, headers })
  const response = await gateRequest(auth, req, new URL(req.url), { artifactsDir, publicUrl: ORIGIN })
  return response ?? new Response("renderer", { status: 200 })
}

function form(values: Record<string, string>): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(values).toString(),
  }
}

async function signIn(): Promise<string> {
  await request("/login", form({ return_to: "/" }))
  const response = await request("/login/verify", form({ code: sent.at(-1)!, return_to: "/" }))
  const cookie = response.headers.get("set-cookie") ?? ""
  return cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))![1]
}

function pkce(): { verifier: string; challenge: string } {
  const verifier = "v".repeat(20) + Math.random().toString(36).slice(2).padEnd(30, "x")
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") }
}

async function registerClient(): Promise<string> {
  const response = await request("/oauth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_name: "Claude Code", redirect_uris: [REDIRECT] }),
  })
  expect(response.status).toBe(201)
  return ((await response.json()) as { client_id: string }).client_id
}

async function accessToken(): Promise<{ access: string; refresh: string; clientId: string }> {
  const session = await signIn()
  const clientId = await registerClient()
  const { verifier, challenge } = pkce()
  const params = {
    response_type: "code",
    client_id: clientId,
    redirect_uri: REDIRECT,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: "st",
  }
  const approved = await request("/oauth/authorize", { ...form({ ...params, decision: "approve" }), cookie: session })
  const code = new URL(approved.headers.get("location")!).searchParams.get("code")!
  const token = await request("/oauth/token", form({ grant_type: "authorization_code", code, code_verifier: verifier, client_id: clientId, redirect_uri: REDIRECT }))
  const body = (await token.json()) as { access_token: string; refresh_token: string }
  return { access: body.access_token, refresh: body.refresh_token, clientId }
}

async function rpc(bearer: string, method: string, params: Record<string, unknown> = {}): Promise<any> {
  const response = await request("/mcp", {
    method: "POST",
    bearer,
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  })
  return response.json()
}

describe("redirect and return_to rules", () => {
  test("allows loopback http and the claude.ai callback only", () => {
    expect(isAllowedRedirectUri("http://localhost:5555/callback")).toBe(true)
    expect(isAllowedRedirectUri("http://127.0.0.1:5555/cb")).toBe(true)
    expect(isAllowedRedirectUri("https://claude.ai/api/mcp/auth_callback")).toBe(true)
    expect(isAllowedRedirectUri("https://evil.example/callback")).toBe(false)
    expect(isAllowedRedirectUri("http://localhost.evil.example/callback")).toBe(false)
    expect(isAllowedRedirectUri("javascript:alert(1)")).toBe(false)
  })

  test("return_to stays on this site", () => {
    expect(safeReturnTo("/proj/slug/")).toBe("/proj/slug/")
    expect(safeReturnTo("//evil.example")).toBe("/")
    expect(safeReturnTo("https://evil.example")).toBe("/")
    expect(safeReturnTo("/\\evil.example")).toBe("/")
  })
})

describe("browser gate", () => {
  test("pages redirect to login and data APIs answer 401 without a session", async () => {
    const page = await request("/proj/slug/", { headers: { accept: "text/html" } })
    expect(page.status).toBe(303)
    expect(page.headers.get("location")).toBe("/login?return_to=%2Fproj%2Fslug%2F")
    expect((await request("/data/artifacts/index.json")).status).toBe(401)
    expect((await request("/api/annotations/author")).status).toBe(401)
    expect((await request("/", { method: "HEAD" })).status).toBe(303)
  })

  test("the Slack code signs the browser in and returns to the page", async () => {
    await request("/login", form({ return_to: "/proj/slug/" }))
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatch(/^\d{6}$/)
    const verified = await request("/login/verify", form({ code: sent[0], return_to: "/proj/slug/" }))
    expect(verified.status).toBe(303)
    expect(verified.headers.get("location")).toBe("/proj/slug/")
    const cookie = verified.headers.get("set-cookie")!
    expect(cookie).toContain("HttpOnly")
    expect(cookie).toContain("Secure")
    const session = cookie.match(/var_session=([^;]+)/)![1]
    expect((await request("/data/artifacts/index.json", { cookie: session })).status).toBe(200)
  })

  test("a code works once", async () => {
    const session = await signIn()
    expect(session).toBeTruthy()
    const again = await request("/login/verify", form({ code: sent[0], return_to: "/" }))
    expect(again.headers.get("set-cookie")).toBeNull()
  })

  test("wrong codes lock the code after the attempt limit", async () => {
    await request("/login", form({}))
    const wrong = sent[0] === "000000" ? "111111" : "000000"
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) await request("/login/verify", form({ code: wrong }))
    const late = await request("/login/verify", form({ code: sent[0] }))
    expect(late.headers.get("set-cookie")).toBeNull()
    expect(late.headers.get("location")).toContain("error=locked")
  })

  test("codes expire", async () => {
    await request("/login", form({}))
    now += 11 * 60 * 1000
    const late = await request("/login/verify", form({ code: sent[0] }))
    expect(late.headers.get("location")).toContain("error=expired")
  })

  test("a new code needs the resend interval", async () => {
    await request("/login", form({}))
    await request("/login", form({}))
    expect(sent).toHaveLength(1)
    now += OTP_RESEND_INTERVAL_MS
    await request("/login", form({}))
    expect(sent).toHaveLength(2)
  })

  test("cross-site form posts are refused", async () => {
    const response = await request("/login", { ...form({}), headers: { origin: "https://evil.example", "content-type": "application/x-www-form-urlencoded" } })
    expect(response.status).toBe(403)
    expect(sent).toHaveLength(0)
  })

  test("logout ends the session", async () => {
    const session = await signIn()
    await request("/logout", { method: "POST", cookie: session })
    expect((await request("/data/artifacts/index.json", { cookie: session })).status).toBe(401)
  })
})

describe("OAuth", () => {
  test("publishes resource and authorization server metadata", async () => {
    const resource = (await (await request("/.well-known/oauth-protected-resource")).json()) as Record<string, unknown>
    expect(resource.resource).toBe(`${ORIGIN}/mcp`)
    expect(resource.authorization_servers).toEqual([ORIGIN])
    const server = (await (await request("/.well-known/oauth-authorization-server")).json()) as Record<string, unknown>
    expect(server.issuer).toBe(ORIGIN)
    expect(server.code_challenge_methods_supported).toEqual(["S256"])
    expect(server.registration_endpoint).toBe(`${ORIGIN}/oauth/register`)
  })

  test("/mcp without a token points at the resource metadata", async () => {
    const response = await request("/mcp", { method: "POST", body: "{}" })
    expect(response.status).toBe(401)
    expect(response.headers.get("www-authenticate")).toBe(`Bearer resource_metadata="${ORIGIN}/.well-known/oauth-protected-resource"`)
  })

  test("registration rejects non-loopback redirect URIs", async () => {
    const response = await request("/oauth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ redirect_uris: ["https://evil.example/callback"] }),
    })
    expect(response.status).toBe(400)
  })

  test("authorize sends a signed-out user to login, then shows consent", async () => {
    const clientId = await registerClient()
    const { challenge } = pkce()
    const query = new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: REDIRECT, code_challenge: challenge, code_challenge_method: "S256" })
    const signedOut = await request(`/oauth/authorize?${query}`)
    expect(signedOut.status).toBe(303)
    expect(signedOut.headers.get("location")).toStartWith("/login?return_to=%2Foauth%2Fauthorize")
    const session = await signIn()
    const consent = await request(`/oauth/authorize?${query}`, { cookie: session })
    expect(consent.status).toBe(200)
    expect(await consent.text()).toContain("Allow Claude Code?")
  })

  test("authorize refuses an unregistered redirect URI without redirecting", async () => {
    const clientId = await registerClient()
    const query = new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: "http://localhost:1/other", code_challenge: pkce().challenge, code_challenge_method: "S256" })
    const response = await request(`/oauth/authorize?${query}`)
    expect(response.status).toBe(400)
    expect(response.headers.get("location")).toBeNull()
  })

  test("authorize requires S256 PKCE", async () => {
    const clientId = await registerClient()
    const query = new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: REDIRECT, code_challenge: "plain", code_challenge_method: "plain" })
    const response = await request(`/oauth/authorize?${query}`)
    expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBe("invalid_request")
  })

  test("deny returns access_denied", async () => {
    const session = await signIn()
    const clientId = await registerClient()
    const params = { response_type: "code", client_id: clientId, redirect_uri: REDIRECT, code_challenge: pkce().challenge, code_challenge_method: "S256", state: "st" }
    const denied = await request("/oauth/authorize", { ...form({ ...params, decision: "deny" }), cookie: session })
    const location = new URL(denied.headers.get("location")!)
    expect(location.searchParams.get("error")).toBe("access_denied")
    expect(location.searchParams.get("state")).toBe("st")
  })

  test("code + verifier yields tokens; codes are single use and need the right verifier", async () => {
    const session = await signIn()
    const clientId = await registerClient()
    const { verifier, challenge } = pkce()
    const params = { response_type: "code", client_id: clientId, redirect_uri: REDIRECT, code_challenge: challenge, code_challenge_method: "S256" }
    const approve = async () => {
      const response = await request("/oauth/authorize", { ...form({ ...params, decision: "approve" }), cookie: session })
      return new URL(response.headers.get("location")!).searchParams.get("code")!
    }

    const badCode = await approve()
    const bad = await request("/oauth/token", form({ grant_type: "authorization_code", code: badCode, code_verifier: "w".repeat(50), client_id: clientId }))
    expect(bad.status).toBe(400)
    expect(((await bad.json()) as { error: string }).error).toBe("invalid_grant")

    const code = await approve()
    const ok = await request("/oauth/token", form({ grant_type: "authorization_code", code, code_verifier: verifier, client_id: clientId, redirect_uri: REDIRECT }))
    expect(ok.status).toBe(200)
    expect(ok.headers.get("cache-control")).toBe("no-store")
    const body = (await ok.json()) as { access_token: string; token_type: string }
    expect(body.token_type).toBe("Bearer")

    const replay = await request("/oauth/token", form({ grant_type: "authorization_code", code, code_verifier: verifier, client_id: clientId }))
    expect(replay.status).toBe(400)
  })

  test("refresh tokens rotate and access tokens expire", async () => {
    const { access, refresh, clientId } = await accessToken()
    const refreshed = await request("/oauth/token", form({ grant_type: "refresh_token", refresh_token: refresh, client_id: clientId }))
    expect(refreshed.status).toBe(200)
    const reused = await request("/oauth/token", form({ grant_type: "refresh_token", refresh_token: refresh, client_id: clientId }))
    expect(reused.status).toBe(400)

    expect(((await rpc(access, "ping")) as { result: unknown }).result).toEqual({})
    now += 2 * 60 * 60 * 1000 + 1
    const expired = await request("/mcp", { method: "POST", bearer: access, body: "{}" })
    expect(expired.status).toBe(401)
  })

  test("a bearer token does not open the browser pages", async () => {
    const { access } = await accessToken()
    expect((await request("/data/artifacts/index.json", { bearer: access })).status).toBe(401)
  })
})

describe("MCP", () => {
  const spec = {
    slug: "hello-world",
    title: "Hello",
    nodes: [{ type: "chapter", props: { title: "It works", deck: "One sentence." }, children: [{ type: "prose", props: { content: "Hi" } }] }],
  }

  test("initialize and tools/list", async () => {
    const { access } = await accessToken()
    const init = await rpc(access, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } })
    expect(init.result.protocolVersion).toBe("2025-06-18")
    expect(init.result.capabilities.tools).toBeDefined()
    const list = await rpc(access, "tools/list")
    expect(list.result.tools.map((tool: { name: string }) => tool.name)).toEqual([
      "get_authoring_guide",
      "get_artifact_contract",
      "validate_visual_artifact",
      "create_visual_artifact",
      "get_visual_artifact",
      "list_visual_artifacts",
    ])
  })

  test("notifications get 202 and no body", async () => {
    const { access } = await accessToken()
    const response = await request("/mcp", {
      method: "POST",
      bearer: access,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    })
    expect(response.status).toBe(202)
  })

  test("create, get and list an artifact", async () => {
    const { access } = await accessToken()
    const created = await rpc(access, "tools/call", { name: "create_visual_artifact", arguments: { project: "my-repo", spec } })
    expect(created.result.isError).toBeUndefined()
    expect(created.result.structuredContent.url).toBe(`${ORIGIN}/my-repo/hello-world/`)
    const saved = JSON.parse(await readFile(join(artifactsDir, "my-repo", "hello-world", "artifact.json"), "utf8"))
    expect(saved.title).toBe("Hello")

    const got = await rpc(access, "tools/call", { name: "get_visual_artifact", arguments: { project: "my-repo", slug: "hello-world" } })
    expect(JSON.parse(got.result.content[0].text).slug).toBe("hello-world")

    const listed = await rpc(access, "tools/call", { name: "list_visual_artifacts", arguments: {} })
    expect(listed.result.structuredContent.artifacts[0].url).toBe(`${ORIGIN}/my-repo/hello-world/`)
  })

  test("invalid specs come back as tool errors", async () => {
    const { access } = await accessToken()
    const result = await rpc(access, "tools/call", { name: "create_visual_artifact", arguments: { project: "my-repo", spec: { slug: "x" } } })
    expect(result.result.isError).toBe(true)
  })

  test("reserved and unsafe project names are refused", async () => {
    const { access } = await accessToken()
    for (const project of ["mcp", "../etc", "Login"]) {
      const result = await rpc(access, "tools/call", { name: "create_visual_artifact", arguments: { project, spec } })
      expect(result.result.isError).toBe(true)
    }
  })

  test("src paths that would read this server's disk are refused", async () => {
    const { access } = await accessToken()
    const withSrc = {
      ...spec,
      nodes: [{ type: "code", props: { src: "/etc/passwd", language: "text" } }],
    }
    const result = await rpc(access, "tools/call", { name: "create_visual_artifact", arguments: { project: "my-repo", spec: withSrc } })
    expect(result.result.isError).toBe(true)
    expect(result.result.content[0].text).toContain("nodes[0].props.src")
  })

  test("findDiskSources ignores image src and finds nested file-tree src", () => {
    expect(findDiskSources([{ type: "image", props: { src: "assets/a.png" } }])).toEqual([])
    expect(
      findDiskSources([
        { type: "chapter", props: { title: "t" }, children: [{ type: "file-tree", props: { items: [{ name: "a", children: [{ name: "b", src: "b.ts" }] }] } }] },
      ]),
    ).toEqual(["nodes[0].children[0].props.items[0].children[0].src"])
  })

  test("contract and guide tools answer", async () => {
    const { access } = await accessToken()
    const summary = await rpc(access, "tools/call", { name: "get_artifact_contract", arguments: {} })
    expect(summary.result.content[0].text).toContain("Node types:")
    const node = await rpc(access, "tools/call", { name: "get_artifact_contract", arguments: { node: "chapter" } })
    expect(JSON.parse(node.result.content[0].text).type).toBe("chapter")
    const guide = await rpc(access, "tools/call", { name: "get_authoring_guide", arguments: {} })
    expect(guide.result.content[0].text).toContain("Anti-box rules")
  })
})
