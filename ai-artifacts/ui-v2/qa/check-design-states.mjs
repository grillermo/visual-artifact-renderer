import { execFileSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

const out = resolve(import.meta.dirname, "cycle-1-closed")
mkdirSync(out, { recursive: true })
const ab = (...args) => execFileSync("agent-browser", ["--headed", "false", "--session", "ui-v2-design-states", ...args], {
  encoding: "utf8", timeout: 60000,
  env: { ...process.env, VISUAL_ARTIFACT_OPEN: "0", AGENT_BROWSER_SKILLS_DIR: resolve(process.env.HOME, ".agents/agent-browser/skill-data") },
}).trim()
const evaluate = js => JSON.parse(JSON.parse(ab("eval", `JSON.stringify(${js})`)))
const results = []
try {
  ab("open", "http://localhost:9991/")
  for (const width of [1920, 1280, 1024, 768]) for (const theme of ["light", "dark"]) for (const comments of [false, true]) {
    ab("set", "viewport", String(width), "900")
    ab("set", "media", theme)
    ab("eval", `localStorage.setItem('theme','${theme}')`)
    ab("open", "http://localhost:9991/ui-v2/code-walkthrough-fixture/")
    ab("wait", "--fn", `document.documentElement.classList.contains('dark')===${theme === "dark"} && !!document.querySelector('button[aria-label="Comments"]') && !!document.querySelector('.va-code-row code span[style]')`)
    ab("eval", `(()=>{const b=document.querySelector('button[aria-label="Comments"]');if((b.getAttribute('aria-pressed')==='true')!==${comments})b.click()})()`)
    ab("wait", "--fn", `document.querySelector('button[aria-label="Comments"]').getAttribute('aria-pressed')==='${comments}'`)
    ab("wait", "--fn", "!!document.querySelector('.va-code-row code span[style]')")
    ab("wait", "--fn", "(()=>{const w=document.querySelector('.va-walkthrough'),t=document.querySelector('.va-execution-trace');return w.hasAttribute('data-wide')===(w.clientWidth>=900)&&t.hasAttribute('data-wide')===(t.clientWidth>=960)})()")
    const wide = evaluate("!!document.querySelector('.va-walkthrough[data-wide]')")
    if (wide) {
      ab("eval", "document.querySelectorAll('.va-walkthrough-step-title')[2].click()")
      ab("wait", "--fn", "document.querySelector('.va-walkthrough-pane .va-code-header').textContent.includes('src/cache.ts')")
      ab("eval", "document.querySelector('.va-walkthrough-pane').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}))")
      ab("wait", "--fn", "document.querySelector('.va-walkthrough-steps li:nth-child(2)').hasAttribute('data-active')")
    }
    ab("eval", "document.querySelectorAll('.va-trace-frame')[3].click()")
    ab("wait", "--fn", "document.querySelector('.va-trace-boundary [data-outcome=passed]')!==null")
    const metrics = evaluate(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,walkthroughWide:!!document.querySelector('.va-walkthrough[data-wide]'),walkthroughWidth:document.querySelector('.va-walkthrough').clientWidth,traceWide:!!document.querySelector('.va-execution-trace[data-wide]'),stackWidth:document.querySelector('.va-trace-stack').clientWidth,traceWidth:document.querySelector('.va-execution-trace').clientWidth,traceCollapsed:[...document.querySelectorAll('.va-trace-stack details')].every(d=>!d.open),selectedBoundary:!!document.querySelector('.va-trace-boundary [data-outcome=passed]'),pageStayedStill:scrollY===0})`)
    ab("screenshot", "--full", resolve(out, `fixture__${width}__${theme}__comments-${comments}.png`))
    const pass = metrics.scrollWidth <= width && metrics.walkthroughWide === (metrics.walkthroughWidth >= 900) && metrics.traceWide === (metrics.traceWidth >= 960) && metrics.traceCollapsed && metrics.selectedBoundary && metrics.pageStayedStill
    results.push({ width, theme, comments, ...metrics, pass })
    console.log(`${width} ${theme} comments=${comments}: ${pass ? "PASS" : "FAIL"}`)
  }
  ab("set", "viewport", "1440", "900")
  ab("open", "http://localhost:9991/ui-v2-samples/project-atlas-var-how-it-works/")
  ab("wait", "--fn", "!!document.querySelector('[data-table] tbody tr')")
  const before = evaluate("getComputedStyle(document.querySelector('[data-table] tbody tr')).backgroundColor")
  ab("find", "first", "[data-table] tbody tr", "hover")
  ab("wait", "--fn", `getComputedStyle(document.querySelector('[data-table] tbody tr')).backgroundColor!==${JSON.stringify(before)}`)
  const hover = evaluate("({duration:getComputedStyle(document.querySelector('[data-table] tbody tr')).transitionDuration,property:getComputedStyle(document.querySelector('[data-table] tbody tr')).transitionProperty})")
  results.push({ tableHover: hover, pass: hover.duration === "0.1s" && hover.property.includes("color") })
} finally {
  ab("close")
  writeFileSync(resolve(out, "design-states.json"), JSON.stringify(results, null, 2) + "\n")
}
if (results.some(result => !result.pass)) process.exitCode = 1
