# Node redesign dev environment

The source renderer runs at http://127.0.0.1:9990/. Its artifact store is local to this worktree. Do not run `visual-artifact bootstrap`, `serve`, or the default `pnpm dev` for this work.

## Install dependencies and check the baseline

Node 22.22.3, pnpm 11.5.2 and Bun 1.4.2 were already available. No global runtime changes were needed.

```bash
ROOT="$HOME/dev/worktrees/var/node-redesign"
cd "$ROOT"
node --version
pnpm --version
bun --version

cd "$ROOT/shared"
pnpm install
pnpm build

cd "$ROOT/app"
pnpm install --frozen-lockfile
pnpm test
pnpm export:contract

cd "$ROOT/cli"
pnpm install
bun run build
```

Build shared before installing app and CLI dependencies. They consume its generated `dist/` exports. The CLI build creates `cli/dist/visual-artifact`; it does not install globally. Its missing `app/out` warning is expected here because Next dev does not require a static export.

## Copy the report bundle

The renderer normally reads `~/.agents/skills/visual-artifact/artifacts/<project>/<slug>/artifact.json`. `VISUAL_ARTIFACT_ARTIFACTS_DIR` overrides that root in both the renderer and CLI. Copy the whole bundle so relative assets remain available.

Run once, before starting the server:

```bash
ROOT="$HOME/dev/worktrees/var/node-redesign"
STORE="$ROOT/ai-artifacts/node-redesign/store"
mkdir -p "$STORE/agents2"
cp -R "$HOME/.agents/skills/visual-artifact/artifacts/agents2/agents2-week-2026-10-04" "$STORE/agents2/"
```

Do not repeat the copy onto an existing bundle directory. The baseline copy matches the source bundle byte for byte.

## Start the server

The server is already running. Check port 9990 before starting another instance. Do not stop an unknown listener.

```bash
ROOT="$HOME/dev/worktrees/var/node-redesign"
STORE="$ROOT/ai-artifacts/node-redesign/store"
lsof -nP -iTCP:9990 -sTCP:LISTEN

# Run only when port 9990 is free.
mkdir -p "$STORE"
cd "$ROOT/app"
nohup env PORT=9990 VISUAL_ARTIFACT_ARTIFACTS_DIR="$STORE" \
  npx next dev -p 9990 \
  > "$ROOT/ai-artifacts/node-redesign/dev.log" 2>&1 < /dev/null &
printf '%s\n' "$!" > "$ROOT/ai-artifacts/node-redesign/dev.pid"

curl --fail --silent --show-error --max-time 120 \
  http://127.0.0.1:9990/agents2/agents2-week-2026-10-04/ -o /dev/null
```

`dev.pid` records the background launcher. The actual Next listener can be its child; use `lsof` to identify it. Startup logs are in `dev.log`. Next dev also generates untracked `app/AGENTS.md` and `app/CLAUDE.md` on startup.

## Validate and create an artifact

All commands below use the local store and avoid starting the CLI static server.

```bash
ROOT="$HOME/dev/worktrees/var/node-redesign"
export VISUAL_ARTIFACT_ARTIFACTS_DIR="$ROOT/ai-artifacts/node-redesign/store"
export VISUAL_ARTIFACT_PORT=9990
export VISUAL_ARTIFACT_BASE_URL=http://127.0.0.1:9990
export VISUAL_ARTIFACT_OPEN=0
cd "$ROOT/cli"

# Replace this path with your own spec.json when needed.
SPEC="$ROOT/ai-artifacts/node-redesign/smoke-spec.json"
bun run src/main.ts validate "$SPEC"
bun run src/main.ts --json create "$SPEC" --project "$ROOT" --no-serve

# The compiled workspace CLI supports the same commands.
./dist/visual-artifact validate "$SPEC"
./dist/visual-artifact --json create "$SPEC" --project "$ROOT" --no-serve

curl --fail --silent --show-error \
  http://127.0.0.1:9990/node-redesign/dev-store-smoke/ -o /dev/null

# Validate all bundles in the isolated store through the renderer schema.
cd "$ROOT/app"
pnpm verify:artifacts
```

`--project` takes a directory, not an arbitrary display name. The CLI derives the project name from the Git root basename. This worktree therefore writes under `store/node-redesign/<slug>/`. Creation overwrites the same slug's `artifact.json`; use a new slug to keep previous output.

## Capture screenshots

Use the installed `agent-browser`; do not install another copy. Its guide command needs the shipped skills directory in this environment:

```bash
AGENT_BROWSER_SKILLS_DIR="$HOME/.agents/agent-browser/skill-data" \
  agent-browser skills get core
```

Capture all four full-page images with the helper:

```bash
ROOT="$HOME/dev/worktrees/var/node-redesign"
"$ROOT/ai-artifacts/node-redesign/shot.sh" \
  http://127.0.0.1:9990/agents2/agents2-week-2026-10-04/ \
  "$ROOT/ai-artifacts/node-redesign/before/weekly-report"
```

Use an `after/weekly-report` prefix for redesign captures so the before images stay unchanged.

The helper uses a separate temporary browser session and closes it on exit. It sets the `visualizer-theme` localStorage key to `light` or `dark`, then reloads. `next-themes` applies the matching class to `<html>`. It sets the same media preference, requests reduced motion, and waits for fonts, images, Mermaid loading to finish and two painted frames. It does not change renderer styles or hide the Next dev indicator.

Viewport sizes are 1440 × 1000 for desktop and 390 × 844 for mobile. Full-page output heights depend on content. The four files are:

- `weekly-report-light-desktop.png`
- `weekly-report-dark-desktop.png`
- `weekly-report-light-mobile.png`
- `weekly-report-dark-mobile.png`

For one manual capture, the equivalent commands are:

```bash
SESSION=node-redesign-manual
URL=http://127.0.0.1:9990/agents2/agents2-week-2026-10-04/
agent-browser --session "$SESSION" --headed false open "$URL"
agent-browser --session "$SESSION" set viewport 1440 1000
agent-browser --session "$SESSION" set media light reduced-motion
agent-browser --session "$SESSION" eval "localStorage.setItem('visualizer-theme', 'light')"
agent-browser --session "$SESSION" reload
agent-browser --session "$SESSION" wait --fn "document.documentElement.classList.contains('light')"
agent-browser --session "$SESSION" eval 'document.fonts.ready.then(() => true)'
agent-browser --session "$SESSION" wait --fn 'Array.from(document.images).every(image => image.complete)'
agent-browser --session "$SESSION" wait --fn '!document.querySelector("main").textContent.includes("Rendering Mermaid")'
agent-browser --session "$SESSION" eval 'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))'
agent-browser --session "$SESSION" screenshot --full "$ROOT/ai-artifacts/node-redesign/manual-light-desktop.png"
agent-browser --session "$SESSION" close
```

Use `390 844` for mobile and replace both theme values with `dark` for dark mode.

## Baseline server

The honest before renderer runs at http://127.0.0.1:9991/ from an archived copy of HEAD `19338fdd026f1a651f68a0481d45bf99e64db9d2`, version 0.10.1. Port 9990 now follows workers' source edits and must not be used for new before captures.

- renderer copy: `ai-artifacts/node-redesign/baseline-app/`
- isolated store: `ai-artifacts/node-redesign/store-before/`
- log: `ai-artifacts/node-redesign/baseline.log`
- listener PID at setup: `21424`, recorded in `baseline.pid`
- local `.gitignore` excludes `baseline-app/`, `store/` and `store-before/`

Check the listener with `lsof`; do not stop an unknown process. Leave this server running for comparisons. The following commands show how it was prepared. Run archive, install and bundle-copy steps only when preparing a new, empty baseline directory.

```bash
ROOT="$HOME/dev/worktrees/var/node-redesign"
BASE="$ROOT/ai-artifacts/node-redesign/baseline-app"
STORE="$ROOT/ai-artifacts/node-redesign/store-before"
cd "$ROOT"
mkdir -p "$BASE"
git archive HEAD | tar -x -C "$BASE"

# shared/ has no committed pnpm lockfile.
cd "$BASE/shared"
pnpm install
pnpm build
cd "$BASE/app"
pnpm install --frozen-lockfile
cd "$BASE/cli"
pnpm install

mkdir -p "$STORE/agents2"
cp -R "$ROOT/ai-artifacts/node-redesign/store/agents2/agents2-week-2026-10-04" "$STORE/agents2/"

export VISUAL_ARTIFACT_ARTIFACTS_DIR="$STORE"
export VISUAL_ARTIFACT_PORT=9991
export VISUAL_ARTIFACT_BASE_URL=http://127.0.0.1:9991
export VISUAL_ARTIFACT_OPEN=0
cd "$BASE/cli"
bun run src/main.ts contract --format json
for SPEC in "$ROOT"/ai-artifacts/node-redesign/examples/before/*.json; do
  bun run src/main.ts validate "$SPEC"
  bun run src/main.ts --json create "$SPEC" --project "$ROOT" --no-serve
done
cp -R "$STORE/agents2/agents2-week-2026-10-04/assets" \
  "$STORE/node-redesign/agents2-week-2026-10-04/"

# HEAD proxies client JSON refreshes to :9998. Generated public files
# take precedence over that rewrite, keeping before reads on :9991.
# This adds data files only; tracked renderer code remains unchanged.
mkdir -p "$BASE/app/public/data"
cp -R "$STORE" "$BASE/app/public/data/artifacts"

# Only start when port 9991 is free.
lsof -nP -iTCP:9991 -sTCP:LISTEN
cd "$BASE/app"
nohup env PORT=9991 VISUAL_ARTIFACT_ARTIFACTS_DIR="$STORE" \
  ./node_modules/.bin/next dev -p 9991 \
  > "$ROOT/ai-artifacts/node-redesign/baseline.log" 2>&1 < /dev/null &
```

The weekly report bundle is available under both `agents2` and `node-redesign`. Its unused sidecar assets were retained at both URLs. If you recreate a spec, update its matching generated JSON mirror under `baseline-app/app/public/data/artifacts/` too. Do not use `bootstrap`, `serve`, the live artifact store, or ports 9998/9999 for this baseline.

### Before examples

All five specs are in `examples/before/` and validate through the archived CLI. The four new examples use the archived skill and its content guides, not the redesigned contract.

| Example | URL on the baseline server | Screenshot prefix in `before/` |
|---|---|---|
| Weekly report | http://127.0.0.1:9991/node-redesign/agents2-week-2026-10-04/ | `weekly-report` |
| Design explainer and data flow | http://127.0.0.1:9991/node-redesign/before-compaction-design/ | `2-design-explainer-data-flow` |
| Implementation plan | http://127.0.0.1:9991/node-redesign/before-agents2-implementation-plan/ | `3-implementation-plan` |
| Decision and comparison | http://127.0.0.1:9991/node-redesign/before-skill-distribution-decision/ | `4-decision-comparison` |
| Status and open loops | http://127.0.0.1:9991/node-redesign/before-tool-ui-status/ | `5-status-open-loops` |

Capture another before page with the existing helper and the matching prefix:

```bash
"$ROOT/ai-artifacts/node-redesign/shot.sh" \
  http://127.0.0.1:9991/node-redesign/before-compaction-design/ \
  "$ROOT/ai-artifacts/node-redesign/before/2-design-explainer-data-flow"
```

There are 20 PNGs: light/dark and desktop/mobile for each example. The four pre-existing weekly-report images were verified and retained. The other 16 were captured on port 9991. Plan claims start open so the full milestone structure is visible; secondary accordions retain their default collapsed state.

### Validation and caveats

- `before-contract.json` records the baseline CLI contract with 48 node types.
- `baseline-isolation.json` verifies 260 tracked renderer, shared, CLI and skill files against HEAD, with zero changes.
- `before-validate.log` records all five successful baseline CLI validations.
- `before-create.log` records all five successful CLI creations with `--no-serve`.
- `before-local-mirrors.json` records HTTP 200 JSON responses matching the isolated store byte for byte.
- `before-verify-artifacts.log` records six valid bundles and contract/manifest checks through the baseline renderer schema.
- `before-urls.json`, `before-browser-evidence.json` and `before-screenshots.json` record HTTP 200 routes, browser checks and PNG dimensions.
- `before-shots-2.log` through `before-shots-5.log` record all 16 new captures.
- `agent-browser errors` reported no page errors on the five final pages.

The first comparison screenshots caught a Mermaid loading placeholder. They were replaced after `shot.sh` gained a readiness wait. The baseline Mermaid adapter still draws small diagrams on large white canvases, including in dark mode. This is the actual HEAD output; no zoom or renderer-style correction was applied.

Initial browser loads also logged JSON-refresh 404 warnings from HEAD's hard-coded proxy to port 9998. The final captures use generated local public JSON mirrors and no longer need that proxy. The warnings remain in `baseline.log` as history; no installed server was started, stopped or modified.

The plan source calls its milestones six but enumerates M0 through M6. The artifact keeps the explicit milestone labels. It omits `change-stats` and code line anchors because the source supplies neither measured changes nor verified implementation locations. Its two decision suggestions are proposals, not accepted decisions. The comparison source's ambiguous token column is labelled "Avoids write token" to make its Yes/No values clear.

## Baseline evidence

Before renderer changes:

- `pnpm test` passed 128 tests, with zero failures or skips. See `baseline-test.log`
- `pnpm export:contract` passed and left the tracked contract unchanged. See `baseline-contract.log`
- `bun run build` compiled the CLI and passed its contract smoke test. See `baseline-cli-build.log`
- source and compiled CLI validation and creation passed. See `smoke-create.json` and `smoke-create-binary.json`
- `pnpm verify:artifacts` passed for both local bundles and 48 manifest entries. See `baseline-artifacts.log`
- the copied weekly report and created smoke artifact returned HTTP 200 on port 9990
- the browser reported no page errors when loading the weekly report
- all four screenshot commands succeeded. See `baseline-screenshots.log`
- desktop PNGs are 1440 × 4835; mobile PNGs are 390 × 8801

No pre-existing app test or contract-export failures were found. The browser guide initially failed without `AGENT_BROWSER_SKILLS_DIR`; the command above resolves that without changing installed tooling.
