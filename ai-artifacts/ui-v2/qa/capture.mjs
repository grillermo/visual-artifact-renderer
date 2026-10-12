#!/usr/bin/env node
// Usage: node capture.mjs --side before|after [--port N] [--only slug,slug] [--widths 1440,390] [--themes light,dark] [--sidebar]
// Defaults: before -> 9992, after -> 9991. Never overwrites the other side.
// --sidebar adds one 1440px comments-open capture per theme, alongside normal captures.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, all) => (x.startsWith("--") ? [...a, [x.slice(2), !all[i + 1] || all[i + 1].startsWith("--") ? true : all[i + 1]]] : a), []));
const side = args.side;
if (!["before", "after"].includes(side)) { console.error("--side before|after required"); process.exit(2); }
const port = Number(args.port ?? (side === "before" ? 9992 : 9991));
const widths = (args.widths ?? "1440,390").split(",").map(Number);
const themes = (args.themes ?? "light,dark").split(",");
const only = args.only?.split(",");
const originals = JSON.parse(readFileSync(join(dir, "samples.json"), "utf8"));
const samples = (side === "before"
  ? originals.map((s) => ({ before: s, title: s.title }))
  : JSON.parse(readFileSync(join(dir, "samples-v3.json"), "utf8")))
  .filter((s) => !only || only.includes(s.before.slug));
const captures = widths.flatMap((width) => themes.map((theme) => ({ width, theme, sidebar: false })));
if (args.sidebar) captures.push(...themes.map((theme) => ({ width: 1440, theme, sidebar: true })));
const metricsPath = join(dir, "metrics.json");
const metrics = existsSync(metricsPath) ? JSON.parse(readFileSync(metricsPath, "utf8")) : {};
const session = `qa-${side}-${port}`;
const ab = (...a) => execFileSync("agent-browser", ["--session", session, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const evalJson = (js) => JSON.parse(JSON.parse(ab("eval", js)));
// The site header mounts a Comments ToggleGroupItem; older pages use AnnotationToggle.
const commentsToggle = 'button[aria-label="Open comments"], button[aria-label="Comments"], button[aria-label^="Comments ("]';
const commentsOpen = 'button[aria-label="Close comments"], button[aria-label^="Comments"][aria-pressed="true"]';

for (const s of samples) {
  const original = s.before;
  const target = side === "before" ? original : s.after;
  const url = `http://localhost:${port}/${target.project}/${target.slug}/`;
  const key = `${original.project}/${original.slug}`;
  const types = originals.find((o) => o.project === original.project && o.slug === original.slug)?.types;
  metrics[key] ??= { title: s.title, types, captures: {} };
  for (const { width, theme, sidebar } of captures) {
    const suffix = sidebar ? "__sidebar" : "";
    const captureKey = `${width}__${theme}${suffix}`;
    const file = `${original.project}__${original.slug}__${side}__${width}__${theme}${suffix}.png`;
    try {
      ab("set", "viewport", String(width), "900");
      ab("set", "media", theme);
      ab("open", url);
      ab("eval", `localStorage.setItem('theme','${theme}')`);
      ab("reload");
      ab("eval", `document.documentElement.classList.toggle('dark', ${theme === "dark"})`);
      ab("wait", "1500");
      // Close any persisted panel first so normal captures always have the reading width.
      ab("eval", `document.querySelector('${commentsOpen}')?.click()`);
      if (sidebar) {
        ab("eval", `(() => { const toggle = document.querySelector('${commentsToggle}'); if (!toggle) throw new Error('Comments toggle not found'); toggle.click(); })()`);
        ab("wait", commentsOpen);
      }
      // scroll through the page so lazy content (mermaid, images) renders, then return to top
      ab("eval", `(async()=>{const h=document.documentElement.scrollHeight;for(let y=0;y<h;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,120))}window.scrollTo(0,0);return 1})()`);
      ab("wait", "800");
      const m = evalJson(`JSON.stringify({scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,dark:document.documentElement.classList.contains('dark'),invalid:/Invalid artifact|Invalid discriminator|Artifact validation/i.test(document.body.innerText),commentsOpen:!!document.querySelector('${commentsOpen}')})`);
      if (m.commentsOpen !== sidebar) throw new Error(`Comments panel should be ${sidebar ? "open" : "closed"}`);
      ab("screenshot", "--full", join(dir, file));
      (metrics[key].captures[captureKey] ??= {})[side] = { file, scrollWidth: m.scrollWidth, scrollHeight: m.scrollHeight, invalid: m.invalid, darkApplied: m.dark === (theme === "dark"), sidebarOpen: m.commentsOpen, port };
      console.log(`${side} ${key} ${width} ${theme}${sidebar ? " sidebar" : ""}: ${m.scrollWidth}x${m.scrollHeight}${m.invalid ? " INVALID" : ""}`);
    } catch (e) {
      (metrics[key].captures[captureKey] ??= {})[side] = { file, error: String(e.stderr || e.message).slice(0, 300), port };
      console.error(`FAILED ${side} ${key} ${width} ${theme}${sidebar ? " sidebar" : ""}: ${String(e.stderr || e.message).slice(0, 200)}`);
    }
    writeFileSync(metricsPath, JSON.stringify(metrics, null, 1));
  }
}
try { ab("close"); } catch {}
