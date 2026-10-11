#!/usr/bin/env node
// Rebuilds index.html from metrics.json + samples.json.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const dir = dirname(fileURLToPath(import.meta.url));
const samples = JSON.parse(readFileSync(join(dir, "samples.json"), "utf8"));
const metrics = JSON.parse(readFileSync(join(dir, "metrics.json"), "utf8"));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const cell = (c, side, width) => {
  if (!c) return `<figure><figcaption><strong>${side}</strong> · not captured</figcaption></figure>`;
  if (c.error) return `<figure><figcaption><strong>${side}</strong> · capture failed: ${esc(c.error)}</figcaption></figure>`;
  return `<figure><figcaption><strong>${side}</strong>${c.invalid ? ' <span class="bad">invalid artifact</span>' : ""} · ${c.scrollWidth}×${c.scrollHeight}<br><a href="${esc(c.file)}" target="_blank">${esc(c.file)}</a></figcaption><div class="preview"><a href="${esc(c.file)}" target="_blank"><img loading="lazy" src="${esc(c.file)}" alt="${esc(side)} ${width}"></a></div></figure>`;
};
let flagCount = 0, rows = "";
for (const s of samples) {
  const m = metrics[`${s.project}/${s.slug}`];
  let sections = "";
  const flagsAll = [];
  for (const [k, pair] of Object.entries(m?.captures ?? {}).sort((a, b) => b[0].localeCompare(a[0]))) {
    const [width, theme] = k.split("__");
    const { before: b, after: a } = pair;
    const flags = [];
    if (a?.scrollWidth > Number(width)) flags.push(`after scrollWidth ${a.scrollWidth} > viewport ${width}`);
    if (a?.scrollHeight && b?.scrollHeight && !b.invalid && a.scrollHeight > 1.25 * b.scrollHeight) flags.push(`after height ${a.scrollHeight} > 1.25× before ${b.scrollHeight}`);
    flagsAll.push(...flags.map((f) => `${width} ${theme}: ${f}`));
    sections += `<section><h3>${width} · ${theme}${flags.length ? ` <span class="flag">⚑ ${esc(flags.join("; "))}</span>` : ""}</h3><div class="pair">${cell(b, "before", width)}${cell(a, "after", width)}</div></section>`;
  }
  flagCount += flagsAll.length;
  rows += `<article class="artifact"><header><div><h2>${esc(s.title)}</h2><code>${esc(s.project)}/${esc(s.slug)}</code><div class="types">${esc((s.types.length ? s.types : ["new nodes only"]).join(", "))}</div></div>${flagsAll.length ? `<span class="flag">${flagsAll.length} flag(s)</span>` : ""}</header><div class="grid">${sections}</div></article>`;
}
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Real artifacts before and after the node redesign</title><style>
:root{--ink:#24221f;--muted:#68635d;--line:#d9d4cc;--paper:#f8f6f1;--panel:#fffefa;--accent:#a9422d}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.5 system-ui,sans-serif}main{max-width:1800px;margin:auto;padding:32px 28px 80px}h1{font:clamp(2rem,4vw,3rem)/1.1 Georgia,serif}.lede{color:var(--muted);max-width:900px}.artifact{background:var(--panel);border:1px solid var(--line);border-radius:14px;margin:22px 0;padding:20px}.artifact>header{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid var(--line);padding-bottom:12px;margin-bottom:12px}.artifact h2{font:1.6rem Georgia,serif;margin:0}code{font-size:12px;color:var(--muted)}.types{font-size:12px;color:var(--accent)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(520px,1fr));gap:18px}section h3{font-size:.95rem;margin:0 0 8px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}figure{margin:0;min-width:0}figcaption{font-size:11px;color:var(--muted);overflow-wrap:anywhere;min-height:46px}.preview{height:520px;overflow:auto;background:#eee;border:1px solid var(--line);border-radius:6px}.preview img{display:block;width:100%}.flag,.bad{color:#b00020;font-weight:600;font-size:12px}@media(max-width:850px){.grid{grid-template-columns:1fr}}</style></head><body><main>
<h1>Real artifacts before and after the node redesign</h1>
<p class="lede">Before = commit <code>f69f7b2</code> served on <code>:9992</code>. After = the <code>node-redesign</code> worktree served on <code>:9991</code>. Generated from <code>metrics.json</code> by <code>generate-index.mjs</code>; ⚑ marks after scrollWidth &gt; viewport or after height &gt; 1.25× before. Total flags: <strong>${flagCount}</strong>.</p>
${rows}</main></body></html>`;
writeFileSync(join(dir, "index.html"), html);
console.log(`index.html: ${samples.length} samples, ${flagCount} flags`);
