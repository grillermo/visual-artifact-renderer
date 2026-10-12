import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8")

function block(startPattern: RegExp) {
  const start = css.search(startPattern)
  assert.ok(start >= 0, `block ${startPattern} not found`)
  const open = css.indexOf("{", start)
  let depth = 0
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++
    if (css[i] === "}" && --depth === 0) return css.slice(open, i)
  }
  throw new Error("unterminated block")
}

function token(scope: string, name: string) {
  const match = scope.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))
  assert.ok(match, `--${name} not a hex literal`)
  return match[1]
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const light = block(/^:root\s*\{/m)
const dark = block(/^html\.dark\s*\{/m)
const PAGE_BG = { light: "#faf9f5", dark: "#151412" } // --ivory per theme

for (const [theme, scope] of [["light", light], ["dark", dark]] as const) {
  for (const name of ["signal-new", "signal-risk", "signal-wait", "ink", "ink-muted", "brand"]) {
    test(`${name} reaches 4.5:1 on the ${theme} page background`, () => {
      const ratio = contrast(token(scope, name), PAGE_BG[theme])
      assert.ok(ratio >= 4.5, `${name} ${theme} contrast ${ratio.toFixed(2)} < 4.5`)
    })
  }
}
