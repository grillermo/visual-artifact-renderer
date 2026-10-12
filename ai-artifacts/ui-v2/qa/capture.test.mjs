import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const source = dirname(fileURLToPath(import.meta.url));
const { JSDOM } = createRequire(new URL("../../../app/package.json", import.meta.url))("jsdom");

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "va-capture-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const file of ["capture.mjs", "samples.json", "samples-v3.json"]) {
    copyFileSync(join(source, file), join(dir, file));
  }
  const stub = join(dir, "agent-browser");
  // Replace the external browser boundary. This executable only records calls.
  writeFileSync(stub, `#!/usr/bin/env node
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
const args = process.argv.slice(4);
appendFileSync(process.env.MOCK_CALLS, JSON.stringify(args) + '\\n');
const statePath = process.env.MOCK_STATE;
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : {};
if (args[0] === 'set' && args[1] === 'viewport') state.width = Number(args[2]);
if (args[0] === 'set' && args[1] === 'media') state.dark = args[2] === 'dark';
if (args[0] === 'reload') state.commentsOpen = true;
if (args[0] === 'eval') {
  const js = args[1];
  if (js.includes('?.click()')) state.commentsOpen = false;
  if (js.includes('toggle.click()')) {
    if (process.env.MOCK_NO_TOGGLE) process.exit(1);
    state.commentsOpen = true;
  }
  if (js.startsWith('JSON.stringify({scrollWidth:')) {
    console.log(JSON.stringify(JSON.stringify({ scrollWidth: state.width, scrollHeight: 1800, dark: state.dark, invalid: false, commentsOpen: state.commentsOpen })));
  }
}
if (args[0] === 'screenshot') writeFileSync(args[2], 'fake screenshot');
writeFileSync(statePath, JSON.stringify(state));
`, { mode: 0o755 });
  const env = {
    ...process.env,
    VISUAL_ARTIFACT_OPEN: "0",
    PATH: `${dir}:${process.env.PATH}`,
    MOCK_CALLS: join(dir, "calls.jsonl"),
    MOCK_STATE: join(dir, "state.json"),
  };
  return {
    dir,
    run: (...args) => spawnSync(process.execPath, [join(dir, "capture.mjs"), ...args], { env, encoding: "utf8" }),
    calls: () => readFileSync(env.MOCK_CALLS, "utf8").trim().split("\n").map(JSON.parse),
    metrics: () => JSON.parse(readFileSync(join(dir, "metrics.json"), "utf8")),
    env,
  };
}

test("before and after route independently but pair by the original key, including sidebar shots", (t) => {
  const f = fixture(t);
  const before = f.run("--side", "before", "--port", "9992", "--only", "spawn-lead-workflow", "--widths", "1280,390", "--themes", "light,dark", "--sidebar");
  assert.equal(before.status, 0, before.stderr);
  assert.equal(before.stderr, "");
  const after = f.run("--side", "after", "--sidebar", "--port", "9991", "--only", "spawn-lead-workflow", "--widths", "1280,390", "--themes", "light,dark");
  assert.equal(after.status, 0, after.stderr);
  assert.equal(after.stderr, "");
  const samples = JSON.parse(readFileSync(join(f.dir, "samples-v3.json"), "utf8"));
  const target = samples.find((s) => s.before.slug === "spawn-lead-workflow").after;
  const calls = f.calls();
  const urls = calls.filter((c) => c[0] === "open").map((c) => c[1]);
  assert.equal(urls.length, 12);
  assert.ok(urls.slice(0, 6).every((u) => u === "http://localhost:9992/project-atlas/spawn-lead-workflow/"));
  assert.ok(urls.slice(6).every((u) => u === `http://localhost:9991/${target.project}/${target.slug}/`));
  const metrics = f.metrics();
  assert.deepEqual(Object.keys(metrics), ["project-atlas/spawn-lead-workflow"]);
  const captures = metrics["project-atlas/spawn-lead-workflow"].captures;
  assert.deepEqual(Object.keys(captures), ["1280__light", "1280__dark", "390__light", "390__dark", "1440__light__sidebar", "1440__dark__sidebar"]);
  for (const [key, pair] of Object.entries(captures)) {
    for (const side of ["before", "after"]) {
      assert.equal(pair[side].sidebarOpen, key.endsWith("__sidebar"));
      assert.equal(pair[side].darkApplied, true);
      assert.equal(pair[side].invalid, false);
      assert.equal(pair[side].file, `project-atlas__spawn-lead-workflow__${side}__${key}.png`);
      assert.equal(pair[side].port, side === "before" ? 9992 : 9991);
    }
  }
  assert.equal(calls.filter((c) => c[0] === "screenshot").length, 12);

  const closeScript = calls.find((c) => c[0] === "eval" && c[1].includes("?.click()"))[1];
  const openScript = calls.find((c) => c[0] === "eval" && c[1].includes("toggle.click()"))[1];
  const metricScript = calls.find((c) => c[0] === "eval" && c[1].startsWith("JSON.stringify({scrollWidth:"))[1];
  for (const label of ["Comments", "Comments (3)", "Open comments"]) {
    const dom = new JSDOM('<button aria-pressed="false"></button>', { runScripts: "outside-only" });
    try {
      const button = dom.window.document.querySelector("button");
      button.setAttribute("aria-label", label);
      button.addEventListener("click", () => {
        const pressed = button.getAttribute("aria-pressed") !== "true";
        button.setAttribute("aria-pressed", String(pressed));
        if (label === "Open comments") button.setAttribute("aria-label", pressed ? "Close comments" : label);
      });
      dom.window.eval(closeScript);
      assert.equal(button.getAttribute("aria-pressed"), "false");
      dom.window.eval(openScript);
      assert.equal(JSON.parse(dom.window.eval(metricScript)).commentsOpen, true);
      dom.window.eval(closeScript);
      assert.equal(JSON.parse(dom.window.eval(metricScript)).commentsOpen, false);
    } finally {
      dom.window.close();
    }
  }
});

test("normal captures use defaults and do not require migrated samples for before", (t) => {
  const f = fixture(t);
  rmSync(join(f.dir, "samples-v3.json"));
  const result = f.run("--side", "before", "--only", "diagram-gallery");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  const captures = f.metrics()["project-atlas/diagram-gallery"].captures;
  assert.deepEqual(Object.keys(captures), ["1440__light", "1440__dark", "390__light", "390__dark"]);
  assert.ok(Object.values(captures).every((c) => c.before.port === 9992 && c.before.sidebarOpen === false));
});

test("a missing sidebar toggle records an error rather than a misleading screenshot", (t) => {
  const f = fixture(t);
  f.env.MOCK_NO_TOGGLE = "1";
  const result = f.run("--side", "after", "--only", "diagram-gallery", "--widths", "390", "--themes", "light", "--sidebar");
  assert.equal(result.status, 0);
  assert.match(result.stderr, /FAILED.*sidebar/);
  const captures = f.metrics()["project-atlas/diagram-gallery"].captures;
  assert.equal(captures["390__light"].after.sidebarOpen, false);
  assert.ok(captures["1440__light__sidebar"].after.error);
  assert.equal(f.calls().filter((c) => c[0] === "screenshot").length, 1);
});
