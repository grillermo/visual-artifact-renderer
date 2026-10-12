# Worker brief: real-usage QA harness

You are a worker, not the lead. You are a subagent. Don't run memo. Do not commit.
Do not edit any file under `app/`, `shared/`, `cli/` or `skill/`.
Worktree `/Users/iurysouza/dev/worktrees/var/node-redesign`, branch `node-redesign`.
Reply `REPORT:` when done or `BLOCKED:` if stuck.

## Goal

A repeatable before/after visual QA for real artifacts, in `ai-artifacts/node-redesign/real-usage-qa/`. It already holds `index.html`, `inventory.py` and PNGs from a first pass (8 artifacts, 1440 and 390 light, a few dark). Read `index.html` first; it describes the method:

- "before" is commit `f69f7b2` served on `:9997`
- "after" is this worktree served on `:9999`
- artifacts live in `~/.agents/skills/visual-artifact/artifacts/<project>/<slug>/artifact.json` and are served at `http://localhost:<port>/<project>/<slug>/`

## Tasks

1. Write `real-usage-qa/capture.mjs` (node, drives the `agent-browser` CLI; read `/Users/iurysouza/.pi/agent/skills/agent-browser/SKILL.md`). For a list of samples it captures full-page PNGs at 1440 and 390, light AND dark (toggle via the `dark` class on `<html>` or the page's DARK button), for a given side (`before|after`) and port. It records `document.scrollWidth` and `scrollHeight` per capture into `metrics.json` and never overwrites the other side. Keep the filename scheme `<project>__<slug>__<side>__<width>__<theme>.png`.
   Add `generate-index.mjs` that rebuilds `index.html` from `metrics.json`: one row per sample with before/after side by side per width/theme, scrollWidth/height numbers, and a flag when after scrollWidth > viewport or after height > 1.25x before.
2. Samples: keep the existing 8. Run `python3 inventory.py` and add 4 more legacy-heavy artifacts so that together the set covers `stat-card, grid, card, alert, status-grid, comparison-table, timeline, stepper, accordion, code-block, data-table, definition-list, flow, mermaid`. Prefer the newest. Write the list to `samples.json`.
3. Before server: `git worktree add /tmp/var-before f69f7b2` (reuse if it exists), then `cd /tmp/var-before/app && pnpm install && PORT=9997 pnpm dev` in the background. Confirm `http://localhost:9997/` answers. Capture `side=before` for all 12 samples now; these never change. Do NOT capture "after" yet: two other workers are changing the renderer. "before" cannot render artifacts that use new node types (it shows "Invalid artifact"); record `before.invalid=true` in metrics instead of failing.
4. Leave the `:9997` server and (if you started it) the `:9999` `pnpm dev` from this worktree running. Put their pids in your report.

## Report

Reply `REPORT:` with the sample list and which legacy types each covers, where the scripts are, the exact command to run the after side (for example `node capture.mjs --side after --port 9999`), and any artifact that failed to load.
