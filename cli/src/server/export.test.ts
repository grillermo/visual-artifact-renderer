import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { chmod, mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { EXPORT_TTL_MS, Exporter, ExportError } from "./export.ts"

let dir: string
let sessions: { created: number; ended: number }

// Stands in for SingleFile: records its arguments and writes the last one (the output path).
const FAKE_SINGLE_FILE = `#!/bin/sh
printf '%s\\n' "$@" > "$(dirname "$0")/args.txt"
for last; do :; done
printf '<html>snapshot</html>' > "$last"
`

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "var-export-"))
  sessions = { created: 0, ended: 0 }
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

async function exporter(script = FAKE_SINGLE_FILE): Promise<Exporter> {
  const bin = join(dir, "single-file")
  await writeFile(bin, script, "utf8")
  await chmod(bin, 0o755)
  return new Exporter({
    singleFileBin: bin,
    chromePath: "/fake/chrome",
    exportsDir: join(dir, "exports"),
    localOrigin: "http://127.0.0.1:9998",
    publicUrl: "https://var.example.com",
    session: () => {
      sessions.created++
      return ["sess-token", () => { sessions.ended++ }]
    },
    sessionCookie: "var_session",
  })
}

describe("Exporter", () => {
  test("captures the local page with a temporary session and serves the file by token", async () => {
    const ex = await exporter()
    const result = await ex.export("my-repo", "hello-world")
    expect(result.url).toMatch(/^https:\/\/var\.example\.com\/exports\/[A-Za-z0-9_-]{43}\.html$/)
    expect(sessions).toEqual({ created: 1, ended: 1 })

    const args = await readFile(join(dir, "args.txt"), "utf8")
    expect(args).toContain("http://127.0.0.1:9998/my-repo/hello-world/")
    expect(args).toContain("--browser-cookie=var_session,sess-token,127.0.0.1,/")
    expect(args).toContain("--browser-executable-path=/fake/chrome")

    const response = await ex.serve(new URL(result.url).pathname)
    expect(response?.status).toBe(200)
    expect(await response!.text()).toBe("<html>snapshot</html>")
  })

  test("expired and malformed export paths are 404", async () => {
    const ex = await exporter()
    const result = await ex.export("my-repo", "hello-world")
    const path = new URL(result.url).pathname
    const old = new Date(Date.now() - EXPORT_TTL_MS - 1000)
    await utimes(join(dir, "exports", path.split("/").pop()!), old, old)
    expect((await ex.serve(path))?.status).toBe(404)
    expect((await ex.serve("/exports/../auth.sqlite"))?.status).toBe(404)
    expect((await ex.serve("/exports/strip-chrome.js"))?.status).toBe(404)
    expect(await ex.serve("/my-repo/hello-world/")).toBeNull()
  })

  test("a failed capture reports the error and still ends the session", async () => {
    const ex = await exporter("#!/bin/sh\necho 'browser crashed' >&2\nexit 3\n")
    await expect(ex.export("my-repo", "hello-world")).rejects.toBeInstanceOf(ExportError)
    expect(sessions).toEqual({ created: 1, ended: 1 })
  })
})
