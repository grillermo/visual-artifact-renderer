import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { randomToken } from "./auth-store.ts"

/**
 * Standalone HTML export: renders an artifact page in headless Chrome and
 * saves it with SingleFile as one self-contained file (CSS, fonts and images
 * inlined, scripts removed), so it can be shared where the renderer isn't,
 * e.g. uploaded to a file host. The page is a static snapshot: what the
 * renderer drew, without its interactivity.
 *
 * The file is served once-linked at /exports/<token>.html for EXPORT_TTL_MS,
 * without sign-in: the 256-bit token is the credential.
 */

export const EXPORTS_PATH = "/exports"
export const EXPORT_TTL_MS = 15 * 60 * 1000
const EXPORT_TIMEOUT_MS = 120 * 1000
const EXPORT_FILE = /^[A-Za-z0-9_-]{43}\.html$/

// Injected before the page runs: drop the site header (breadcrumb links back
// to the signed-in site, comment and theme buttons that do nothing offline).
// SingleFile only fires its hooks for user scripts that announce themselves.
const STRIP_CHROME_SCRIPT = `
dispatchEvent(new CustomEvent("single-file-user-script-init"))
addEventListener("single-file-on-before-capture-request", () => {
  document.querySelectorAll('[data-slot="site-header"]').forEach((el) => el.remove())
})
`

export interface ExporterOptions {
  /** SingleFile CLI (single-file-cli's bin/single-file). */
  singleFileBin: string
  /** Chrome/Chromium executable SingleFile drives. */
  chromePath: string
  /** Where export files and the injected script live. */
  exportsDir: string
  /** Origin the renderer listens on locally, e.g. http://127.0.0.1:9998. */
  localOrigin: string
  /** Public origin for the download link. */
  publicUrl: string
  /** Creates a short-lived renderer session for the capture; returns [cookie value, cleanup]. */
  session: () => [string, () => void]
  sessionCookie: string
}

export interface ExportResult {
  url: string
  bytes: number
  expiresAt: string
}

export class ExportError extends Error {}

export function exporterFromEnv(env: NodeJS.ProcessEnv = process.env): Pick<ExporterOptions, "singleFileBin" | "chromePath"> | null {
  const singleFileBin = env.VISUAL_ARTIFACT_SINGLEFILE?.trim()
  const chromePath = env.VISUAL_ARTIFACT_CHROME?.trim()
  return singleFileBin && chromePath ? { singleFileBin, chromePath } : null
}

export class Exporter {
  private queue: Promise<unknown> = Promise.resolve()

  constructor(private readonly options: ExporterOptions) {}

  /** One capture at a time: each runs a whole browser. */
  export(project: string, slug: string): Promise<ExportResult> {
    const run = this.queue.then(() => this.capture(project, slug))
    this.queue = run.catch(() => undefined)
    return run
  }

  private async capture(project: string, slug: string): Promise<ExportResult> {
    await this.pruneExpired()
    await mkdir(this.options.exportsDir, { recursive: true, mode: 0o700 })
    const scriptPath = join(this.options.exportsDir, "strip-chrome.js")
    await writeFile(scriptPath, STRIP_CHROME_SCRIPT, "utf8")

    const token = randomToken()
    const outPath = join(this.options.exportsDir, `${token}.html`)
    const host = new URL(this.options.localOrigin).hostname
    const [cookie, endSession] = this.options.session()
    try {
      const proc = Bun.spawn(
        [
          this.options.singleFileBin,
          `--browser-executable-path=${this.options.chromePath}`,
          `--browser-cookie=${this.options.sessionCookie},${cookie},${host},/`,
          `--browser-script=${scriptPath}`,
          "--browser-wait-until=networkidle2",
          "--browser-wait-delay=1000",
          "--browser-width=1280",
          "--browser-height=900",
          `${this.options.localOrigin}/${project}/${slug}/`,
          outPath,
        ],
        { stdout: "pipe", stderr: "pipe" },
      )
      const timer = setTimeout(() => proc.kill(), EXPORT_TIMEOUT_MS)
      const code = await proc.exited
      clearTimeout(timer)
      const stderr = await new Response(proc.stderr).text()
      const info = await stat(outPath).catch(() => null)
      if (code !== 0 || !info || info.size === 0) {
        await rm(outPath, { force: true })
        throw new ExportError(`Snapshot failed (exit ${code}): ${stderr.trim().slice(-500) || "no output"}`)
      }
      return {
        url: `${this.options.publicUrl}${EXPORTS_PATH}/${token}.html`,
        bytes: info.size,
        expiresAt: new Date(info.mtimeMs + EXPORT_TTL_MS).toISOString(),
      }
    } finally {
      endSession()
    }
  }

  /** Serves /exports/<token>.html until it expires; null for any other path. */
  async serve(pathname: string): Promise<Response | null> {
    if (!pathname.startsWith(`${EXPORTS_PATH}/`)) return null
    const name = pathname.slice(EXPORTS_PATH.length + 1)
    if (!EXPORT_FILE.test(name)) return new Response("Not found", { status: 404 })
    const filePath = join(this.options.exportsDir, name)
    const info = await stat(filePath).catch(() => null)
    if (!info || Date.now() - info.mtimeMs > EXPORT_TTL_MS) {
      if (info) await rm(filePath, { force: true })
      return new Response("Not found", { status: 404 })
    }
    return new Response(Bun.file(filePath), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
      },
    })
  }

  private async pruneExpired(): Promise<void> {
    const names = await readdir(this.options.exportsDir).catch(() => [] as string[])
    for (const name of names) {
      if (!EXPORT_FILE.test(name)) continue
      const filePath = join(this.options.exportsDir, name)
      const info = await stat(filePath).catch(() => null)
      if (info && Date.now() - info.mtimeMs > EXPORT_TTL_MS) await rm(filePath, { force: true })
    }
  }
}
