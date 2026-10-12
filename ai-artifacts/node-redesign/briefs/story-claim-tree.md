# Worker brief: story and claim-tree

You are a worker, not the lead. You are a subagent. Don't run memo. Do not commit.
Worktree `/Users/iurysouza/dev/worktrees/var/node-redesign`, branch `node-redesign`.
Reply `REPORT:` when done or `BLOCKED:` if stuck.

You own exactly two files, plus their tests:

- `app/src/components/adapters/editorial/story-adapter.tsx`
- `app/src/components/adapters/plan/claim-tree-adapter.tsx`

Another worker is editing the legacy adapters, `artifact-primitives.tsx`, `lib/artifacts/status.tsx`, `components/mermaid/*` and `visual-artifact-renderer.tsx` at the same time. Do not touch those. Design spec: `ai-artifacts/node-redesign/design-spec.md`.

## Problem 1: story

Iury rejected it: "story spreads 5 beats across huge empty stages". Look at
`ai-artifacts/node-redesign/real-usage-qa/project-atlas__pi-compaction-flow__after__1440__light.png` and
`project-atlas__diagram-gallery__after__1440__light.png`.

The beats column uses `min-h-[30svh]` per beat (story-adapter.tsx around line 140), so five short beats stretch over about 1.5 screens while the sticky stage sits mostly blank. On desktop the diagram is small inside a 1.2fr column.

Fix so the story reads as one diagram that fills in as you scroll, without blank stretches:

- scroll distance about one stage height per beat or less, not 30svh of near-empty space
- let the diagram use the full stage width
- make the non-interactive fallback compact

Measure before/after full-page height of `http://localhost:9999/project-atlas/pi-compaction-flow/` at 1440 and 390 with agent-browser (dev server on :9999; if `lsof -iTCP:9999` shows nothing, start `cd app && pnpm dev` in the background). Target: the story section no more than about 1.5x the height of its diagram plus beat text on desktop, readable on mobile.

## Problem 2: claim-tree

See `node-redesign-proj__after-agents2-implementation-plan__after__1440__light.png`: 8.3k px desktop, 11.1k mobile, narrow and dense, and the claim-tree repeats its own title "Milestones and acceptance" right under the chapter of the same name. Spec: `ai-artifacts/node-redesign/examples/after/3-implementation-plan.json` (chapter > claim-tree, same title).

Fix:

a. Do not render the claim-tree h2 when it equals the enclosing chapter title (case-insensitive, trimmed). Consider dropping it whenever the claim-tree is a chapter's direct child, since the chapter already names it.
b. The inner 15rem contents rail (claim-tree-adapter.tsx around line 132) duplicates the page rail and steals width inside an already narrow column. Drop it or collapse it to a compact list above the tree so claims, their tables and diagrams get the full column.
c. Reduce vertical sprawl of nested claims: indent and border only where it carries meaning, tighter gaps.

Measure `http://localhost:9999/node-redesign/after-agents2-implementation-plan/` full-page height at 1440 and 390 before and after.

## Verify

`cd app && pnpm lint && npx tsc --noEmit && pnpm test`

Reply `REPORT:` with measured heights before/after for both pages at both widths, what you changed, and lint/tsc/test results.
