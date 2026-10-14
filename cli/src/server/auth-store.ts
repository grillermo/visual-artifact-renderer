import { Database } from "bun:sqlite"
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto"
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"

/**
 * SQLite store for the single-user OAuth server: dynamically registered
 * clients, authorization codes, access/refresh tokens, browser sessions and
 * the current Slack OTP. Every secret is stored as a SHA-256 hash, so a copy
 * of the database cannot be replayed.
 */

export const OTP_TTL_MS = 10 * 60 * 1000
export const OTP_MAX_ATTEMPTS = 5
export const OTP_RESEND_INTERVAL_MS = 30 * 1000
export const OTP_MAX_PER_HOUR = 10
export const CODE_TTL_MS = 5 * 60 * 1000
export const ACCESS_TOKEN_TTL_MS = 2 * 60 * 60 * 1000
export const REFRESH_TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const MAX_CLIENTS = 500

export interface OAuthClient {
  clientId: string
  name: string
  redirectUris: string[]
  createdAt: number
}

export interface AuthorizationCode {
  clientId: string
  redirectUri: string
  codeChallenge: string
  resource: string | null
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export type OtpCheck = "ok" | "invalid" | "expired" | "locked"

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex")
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url")
}

function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex")
  const right = Buffer.from(b, "hex")
  return left.length === right.length && timingSafeEqual(left, right)
}

export class AuthStore {
  readonly db: Database
  private readonly now: () => number

  constructor(path: string, now: () => number = Date.now) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true })
    this.db = new Database(path, { create: true, strict: true })
    this.now = now
    this.db.exec("PRAGMA journal_mode = WAL")
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS clients (
        client_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        redirect_uris TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS codes (
        code_hash TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        redirect_uri TEXT NOT NULL,
        code_challenge TEXT NOT NULL,
        resource TEXT,
        expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tokens (
        token_hash TEXT PRIMARY KEY,
        kind TEXT NOT NULL CHECK (kind IN ('access', 'refresh')),
        client_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        session_hash TEXT PRIMARY KEY,
        expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS otps (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        code_hash TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS otp_sends (
        sent_at INTEGER NOT NULL
      );
    `)
  }

  close(): void {
    this.db.close()
  }

  private prune(): void {
    const now = this.now()
    this.db.run("DELETE FROM codes WHERE expires_at <= ?", [now])
    this.db.run("DELETE FROM tokens WHERE expires_at <= ?", [now])
    this.db.run("DELETE FROM sessions WHERE expires_at <= ?", [now])
    this.db.run("DELETE FROM otp_sends WHERE sent_at <= ?", [now - 60 * 60 * 1000])
  }

  // Clients (RFC 7591 dynamic registration)

  clientCount(): number {
    return (this.db.query("SELECT COUNT(*) AS n FROM clients").get() as { n: number }).n
  }

  registerClient(name: string, redirectUris: string[]): OAuthClient {
    const client: OAuthClient = {
      clientId: randomToken(18),
      name,
      redirectUris,
      createdAt: this.now(),
    }
    this.db.run(
      "INSERT INTO clients (client_id, name, redirect_uris, created_at) VALUES (?, ?, ?, ?)",
      [client.clientId, client.name, JSON.stringify(client.redirectUris), client.createdAt],
    )
    return client
  }

  findClient(clientId: string): OAuthClient | null {
    const row = this.db
      .query("SELECT client_id, name, redirect_uris, created_at FROM clients WHERE client_id = ?")
      .get(clientId) as { client_id: string; name: string; redirect_uris: string; created_at: number } | null
    if (!row) return null
    return {
      clientId: row.client_id,
      name: row.name,
      redirectUris: JSON.parse(row.redirect_uris) as string[],
      createdAt: row.created_at,
    }
  }

  // Authorization codes

  issueCode(grant: AuthorizationCode): string {
    this.prune()
    const code = randomToken()
    this.db.run(
      "INSERT INTO codes (code_hash, client_id, redirect_uri, code_challenge, resource, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
      [hashSecret(code), grant.clientId, grant.redirectUri, grant.codeChallenge, grant.resource, this.now() + CODE_TTL_MS],
    )
    return code
  }

  /** Single use: the code is deleted whether or not the caller accepts it. */
  consumeCode(code: string): AuthorizationCode | null {
    const hash = hashSecret(code)
    const row = this.db
      .query("SELECT client_id, redirect_uri, code_challenge, resource, expires_at FROM codes WHERE code_hash = ?")
      .get(hash) as { client_id: string; redirect_uri: string; code_challenge: string; resource: string | null; expires_at: number } | null
    this.db.run("DELETE FROM codes WHERE code_hash = ?", [hash])
    if (!row || row.expires_at <= this.now()) return null
    return {
      clientId: row.client_id,
      redirectUri: row.redirect_uri,
      codeChallenge: row.code_challenge,
      resource: row.resource,
    }
  }

  // Tokens

  issueTokens(clientId: string): TokenPair {
    this.prune()
    const accessToken = randomToken()
    const refreshToken = randomToken()
    const now = this.now()
    const insert = this.db.prepare("INSERT INTO tokens (token_hash, kind, client_id, expires_at) VALUES (?, ?, ?, ?)")
    insert.run(hashSecret(accessToken), "access", clientId, now + ACCESS_TOKEN_TTL_MS)
    insert.run(hashSecret(refreshToken), "refresh", clientId, now + REFRESH_TOKEN_TTL_MS)
    return { accessToken, refreshToken, expiresIn: Math.floor(ACCESS_TOKEN_TTL_MS / 1000) }
  }

  accessTokenValid(token: string): boolean {
    const row = this.db
      .query("SELECT expires_at FROM tokens WHERE token_hash = ? AND kind = 'access'")
      .get(hashSecret(token)) as { expires_at: number } | null
    return !!row && row.expires_at > this.now()
  }

  /** Rotates: the old refresh token stops working once it has been used. */
  rotateRefreshToken(refreshToken: string, clientId: string): TokenPair | null {
    const hash = hashSecret(refreshToken)
    const row = this.db
      .query("SELECT client_id, expires_at FROM tokens WHERE token_hash = ? AND kind = 'refresh'")
      .get(hash) as { client_id: string; expires_at: number } | null
    if (!row || row.expires_at <= this.now() || row.client_id !== clientId) return null
    this.db.run("DELETE FROM tokens WHERE token_hash = ?", [hash])
    return this.issueTokens(clientId)
  }

  // Browser sessions

  createSession(): string {
    this.prune()
    const session = randomToken()
    this.db.run("INSERT INTO sessions (session_hash, expires_at) VALUES (?, ?)", [hashSecret(session), this.now() + SESSION_TTL_MS])
    return session
  }

  sessionValid(session: string): boolean {
    const row = this.db
      .query("SELECT expires_at FROM sessions WHERE session_hash = ?")
      .get(hashSecret(session)) as { expires_at: number } | null
    return !!row && row.expires_at > this.now()
  }

  deleteSession(session: string): void {
    this.db.run("DELETE FROM sessions WHERE session_hash = ?", [hashSecret(session)])
  }

  // Slack OTP: one live code at a time, since there is one user.

  /** Milliseconds until another code may be sent; 0 when one may go now. */
  otpWaitMs(): number {
    this.prune()
    const now = this.now()
    const sends = this.db.query("SELECT sent_at FROM otp_sends ORDER BY sent_at DESC").all() as { sent_at: number }[]
    if (sends.length >= OTP_MAX_PER_HOUR) {
      return Math.max(0, sends[OTP_MAX_PER_HOUR - 1].sent_at + 60 * 60 * 1000 - now)
    }
    if (sends.length > 0) return Math.max(0, sends[0].sent_at + OTP_RESEND_INTERVAL_MS - now)
    return 0
  }

  issueOtp(): string {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0")
    const now = this.now()
    this.db.run(
      "INSERT INTO otps (id, code_hash, expires_at, attempts) VALUES (1, ?, ?, 0) " +
        "ON CONFLICT (id) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0",
      [hashSecret(code), now + OTP_TTL_MS],
    )
    this.db.run("INSERT INTO otp_sends (sent_at) VALUES (?)", [now])
    return code
  }

  checkOtp(code: string): OtpCheck {
    const row = this.db.query("SELECT code_hash, expires_at, attempts FROM otps WHERE id = 1").get() as
      | { code_hash: string; expires_at: number; attempts: number }
      | null
    if (!row) return "expired"
    if (row.expires_at <= this.now()) {
      this.db.run("DELETE FROM otps WHERE id = 1")
      return "expired"
    }
    if (row.attempts >= OTP_MAX_ATTEMPTS) return "locked"
    if (/^\d{6}$/.test(code) && sameHash(row.code_hash, hashSecret(code))) {
      this.db.run("DELETE FROM otps WHERE id = 1")
      return "ok"
    }
    this.db.run("UPDATE otps SET attempts = attempts + 1 WHERE id = 1")
    return row.attempts + 1 >= OTP_MAX_ATTEMPTS ? "locked" : "invalid"
  }
}
