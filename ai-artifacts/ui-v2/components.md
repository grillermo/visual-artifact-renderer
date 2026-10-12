# Cycle 1 components

Contract **3.0.0** keeps 31 node types and rejects the 34 removed types. No migration command. Current typography and theme tokens remain.

Examples below are paths relative to `~/.agents/skills/visual-artifact/artifacts/`. They identify real component usage, not proof that the entire old bundle parses under major 3. Original historical bundles were not changed. The task's `ui-v2-samples` copies use the new contract.

## Surviving nodes

| Component | Decision | Real-artifact example |
|---|---|---|
| `chapter` | keep — page structure and contents rail | `node-redesign-proj/after-compaction-design/artifact.json` |
| `prose` | keep — Markdown narrative | `project-atlas/pi-extensions-how-it-works/artifact.json` |
| `columns` | keep — bounded text columns | `node-redesign-proj/after-agents2-week-2026-10-04/artifact.json` |
| `callout` | keep — semantic colour on supporting advice | `project-atlas/clockwork-how-it-works/artifact.json` |
| `details` | keep — optional supporting detail | `node-redesign-proj/after-compaction-design/artifact.json` |
| `ledger` | keep — grouped, labelled rows | `node-redesign-proj/after-tool-ui-status/artifact.json` |
| `checklist` | keep — readable state labels | `project-atlas/vault-project-manager-workflow/artifact.json` |
| `figures` | changed — wrap values and labels without collisions | `node-redesign-proj/after-compaction-design/artifact.json` |
| `table` | changed — keep editorial table, restore muted row-hover transitions | `agents/how-jack-communication-works/artifact.json` |
| `steps` | keep — bounded process line | `node-redesign-proj/after-agents2-implementation-plan/artifact.json` |
| `map` | changed — include HTML labels in crop; narrow containers show a connection list | `project-atlas/diagram-gallery/artifact.json` |
| `story` | keep — staged diagram explanation | `project-atlas/pi-compaction-flow/artifact.json` |
| `compare` | keep — visible side-by-side comparison | `node-redesign-proj/after-skill-distribution-decision/artifact.json` |
| `sequence` | changed — sole sequence adapter; remove old dotted diagram frame | `project-atlas/clockwork-how-it-works/artifact.json` |
| `timeline` | keep — literal and dataset-backed chronological rows | `2026-07-20-24/workweek-recap-jul-20-24-2026/artifact.json` |
| `trend` | keep — directly labelled chart | `project-atlas/diagram-gallery/artifact.json` |
| `code` | changed — one flat source view, ranged notes with collision rail, unified/split diffs and word emphasis | `project-atlas/pi-extensions-how-it-works/artifact.json` |
| `links` | keep — explicit source links | `node-redesign/every-node/artifact.json` |
| `quote` | keep — one attributed quotation | `node-redesign/every-node/artifact.json` |
| `claim-tree` | changed — plain outline; no claim-specific comment model | `node-redesign-proj/after-agents2-implementation-plan/artifact.json` |
| `claim` | changed — keep exhibit and numbering; remove claim comment button | `node-redesign-proj/after-agents2-implementation-plan/artifact.json` |
| `walkthrough` | added — ordered source steps, following desktop pane, stacked mobile excerpts | `ui-v2/code-walkthrough-fixture/artifact.json` |
| `state-machine` | keep — lifecycle and screen transitions | `node-redesign-proj/after-agents2-implementation-plan/artifact.json` |
| `mockup` | keep — framed UI explanation | `node-redesign/every-node/artifact.json` |
| `wireframe` | keep — bounded mockup building block | `node-redesign/every-node/artifact.json` |
| `decision` | keep — explicit choices, separate from comments | `project-atlas/agent-skills-distribution/artifact.json` |
| `execution-trace` | changed — wrapping frame tree, full-width inspector, collapsed mobile stack and shared code view | `pi-extensions/cursor-shell-tool-card-trace/artifact.json` |
| `file-tree` | keep — useful CLI directory map, not a substitute for a walkthrough | `agents/visual-artifact-cli-implementation/artifact.json` |
| `image` | keep — screenshots and assets | `fue-agent/fue-agent-diff-review-4506459/artifact.json` |
| `mermaid` | keep — specialised diagrams outside map/sequence | `agents/agents-repo-cheat-sheet/artifact.json` |
| `svg-diagram` | keep — sandboxed specialised exhibit | `agents/agent-infrastructure-constellation/artifact.json` |

## Removed nodes

Dropped in cycle 1: `call-stack`. Use `walkthrough` for an explained source flow and `execution-trace` for verified boundaries.

Dropped in cycle 0: `text`, `heading`, `section`, `card`, `grid`, `tabs`, `accordion`, `stat-card`, `metric`, `badge`, `button`, `separator`, `alert`, `status-grid`, `comparison-table`, `data-table`, `definition-list`, `flow`, `stepper`, `box-diagram`, `sequence-diagram`, `code-block`, `diff`, `log`, `chart`, `area-chart`, `radar-chart`, `scatter-chart`, `pie-chart`, `donut-chart`, `heatmap`, `change-stats`, `quotes`.

Their schema branches, manifest entries and renderer adapters are gone. Historical usage includes `agents/visual-artifact-cli-implementation/artifact.json`; those old bundles are not promised compatibility. Shared low-level UI primitives are not advertised artifact types.

## Page and feedback decisions

- Content max width: **96rem (1536px)**, with a 160px desktop contents rail and 32px gap. Text keeps its own measure; exhibits get the available width.
- Feedback at 1280px and above: **22.5rem (360px)** column. Below 1280px: a **50dvh** bottom sheet; no subtraction from reading width.
- Execution trace: split stack/detail at **60rem** container width; the stack takes 42%, bounded to 24–32rem. Below that, use a collapsed frame disclosure above the source.
- Map: show a labelled connection list below **44rem** rather than shrink a diagram until labels cannot be read.
- New node type: `walkthrough`. The total remains 31 because `call-stack` is removed. Source steps are bounded to 4 files and 8 steps.
- Code rails appear at 900px container width. Split diffs require 720px and p90 line length at most 70 columns. Four or more notes averaging fewer than three source rows per note stay inline. Other notes use measured collision layout with connectors.
- Walkthroughs split at 900px container width. Steps are compact; desktop clicks update source locally. Focus is blue, separate from clay idea notes. Source keeps full-opacity muted context.
- Trace frame labels wrap. The mobile stack is a closed disclosure; source and non-empty inspector columns get full width.
- Feedback persistence: the worktree's development handler writes annotation files atomically instead of relying on a fixed-port proxy.
- Copy Markdown: export every comment body and its node path, including comments nested in surviving containers.

## Cycle 1 design verification

The design gate passes shared build, lint, TypeScript, **238 app tests**, contract export, production build and **319 CLI tests**. Artifact verification passes **4 specs**, including **2 bundles**, and **31 manifest entries and examples**. No schema or CLI change.

Headless agent-browser re-captured all 12 real samples and the acceptance fixture at 1440px and 390px in both themes, with comments open and closed. All **104 captures** pass with zero horizontal page overflow and zero console or page errors. The fixture also passes **16 captures** at 768px, 1024px, 1280px and 1920px in both themes and sidebar states. These checks exercise local walkthrough click and keyboard selection, breakpoint-driven excerpts, selected trace boundaries and collapsed narrow stacks. A browser probe confirms the table row-hover transition remains 100ms.

Evidence lives in `qa/cycle-1/` and `qa/cycle-1-closed/`. Re-run `capture-cycle-1.mjs`, `capture-cycle-1.mjs --comments-closed` and `check-design-states.mjs` with `VISUAL_ARTIFACT_OPEN=0`. Screenshots stay local; result JSON and scripts are committed. Before images remain in ignored `qa/design-before/`.

## Initial cycle 1 verification

The final gate passes shared build, app lint, TypeScript, **234 app tests**, contract export, production build and **319 CLI tests**. `verify:artifacts` passes **4 repository specs**, including **2 bundles**, and all **31 manifest examples**.

Headless agent-browser checked all 12 staged real samples and the acceptance fixture at **1440 and 390**, **light and dark**, with comments open. The **52-capture matrix** has no horizontal page overflow or console errors. Source-bearing samples cover VAR, cloud-agent box, nice-mermaid, Pi extensions and the diagram gallery. Dense desktop notes use five collision connectors; mobile traces start collapsed. Evidence and scripts live in `qa/cycle-1/`, `qa/capture-cycle-1.mjs` and `qa/prepare-cycle-1.ts`.

## Cycle 0 verification

The required gate passed: shared build, app lint, TypeScript, **202 app tests**, contract export, production build and **318 CLI tests**. Generated manifest examples and tracked canonical fixtures also passed `verify:artifacts` with an explicitly empty runtime-store override.

Default `pnpm verify:artifacts` fails on old local bundles such as `artifacts/visualizer/call-stack-excerpts/artifact.json`, because major 3 intentionally rejects their removed nodes. Those bundles were not modified or migrated.

### Cycle 0 limits

DOM tests, static CSS assertions and type checks are not visual acceptance. No browser was opened. Port 9991 was occupied by a process belonging to another worktree; its responses were not used as evidence for this branch. The real examples above still need visual checks at 390px, 1280px and wider desktop sizes, including feedback open and reduced motion.
