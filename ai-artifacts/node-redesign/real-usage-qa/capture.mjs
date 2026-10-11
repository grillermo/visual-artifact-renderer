#!/usr/bin/env node
// Usage: node capture.mjs --side before|after [--port N] [--only slug,slug] [--widths 1440,390] [--themes light,dark]
// Defaults: before -> 9992, after -> 9991. Never overwrites the other side.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, all) => (x.startsWith("--") ? [...a, [x.slice(2), all[i + 1]]] : a), []));
const side = args.side;
if (!["before", "after"].includes(side)) { console.error("--side before|after required"); process.exit(2); }
const port = Number(args.port ?? (side === "before" ? 9992 : 9991));
const widths = (args.widths ?? "1440,390").split(",").map(Number);
const themes = (args.themes ?? "light,dark").split(",");
const only = args.only?.split(",");
const samples = JSON.parse(readFileSync(join(dir, "samples.json"), "utf8")).filter((s) => !only || only.includes(s.slug));
const metricsPath = join(dir, "metrics.json");
const metrics = existsSync(metricsPath) ? JSON.parse(readFileSync(metricsPath, "utf8")) : {};
const session = `qa-${side}-${port}`;
const ab = (...a) => execFileSync("agent-browser", ["--session", session, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const evalJson = (js) => JSON.parse(JSON.parse(ab("eval", js)));

for (const s of samples) {
  const url = `http://localhost:${port}/${s.project}/${s.slug}/`;
  const key = `${s.project}/${s.slug}`;
  metrics[key] ??= { title: s.title, types: s.types, captures: {} };
  for (const width of widths) for (const theme of themes) {
    const file = `${s.project}__${s.slug}__${side}__${width}__${theme}.png`;
    try {
      ab("set", "viewport", String(width), "900");
      ab("set", "media", theme);
      ab("open", url);
      ab("eval", `localStorage.setItem('theme','${theme}')`);
      ab("reload");
      ab("eval", `document.documentElement.classList.toggle('dark', ${theme === "dark"})`);
      ab("wait", "1500");
      // scroll through the page so lazy content (mermaid, images) renders, then return to top
      ab("eval", `(async()=>{const h=document.documentElement.scrollHeight;for(let y=0;y<h;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,120))}window.scrollTo(0,0);return 1})()`);
      ab("wait", "800");
      const m = evalJson(`JSON.stringify({scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,dark:document.documentElement.classList.contains('dark'),invalid:/Invalid artifact|Invalid discriminator|Artifact validation/i.test(document.body.innerText),status:document.body.innerText.slice(0,0)})`);
      ab("screenshot", "--full", join(dir, file));
      (metrics[key].captures[`${width}__${theme}`] ??= {})[side] = { file, scrollWidth: m.scrollWidth, scrollHeight: m.scrollHeight, invalid: m.invalid, darkApplied: m.dark === (theme === "dark"), port };
      console.log(`${side} ${key} ${width} ${theme}: ${m.scrollWidth}x${m.scrollHeight}${m.invalid ? " INVALID" : ""}`);
    } catch (e) {
      (metrics[key].captures[`${width}__${theme}`] ??= {})[side] = { file, error: String(e.stderr || e.message).slice(0, 300), port };
      console.error(`FAILED ${side} ${key} ${width} ${theme}: ${String(e.stderr || e.message).slice(0, 200)}`);
    }
    writeFileSync(metricsPath, JSON.stringify(metrics, null, 1));
  }
}
try { ab("close"); } catch {}
