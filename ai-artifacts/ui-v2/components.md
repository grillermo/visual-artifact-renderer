# Cycle 0 components

Contract **3.0.0** keeps 31 node types and rejects the 33 removed types. No migration command. Current typography and theme tokens remain.

Examples below are paths relative to `~/.agents/skills/visual-artifact/artifacts/`. They identify real component usage, not proof that the entire old bundle parses under major 3. The artifact store was not changed.

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
| `code` | changed — canonical adapter, bare code surface and structured annotations | `project-atlas/pi-extensions-how-it-works/artifact.json` |
| `links` | keep — explicit source links | `node-redesign/every-node/artifact.json` |
| `quote` | keep — one attributed quotation | `node-redesign/every-node/artifact.json` |
| `claim-tree` | changed — plain outline; no claim-specific comment model | `node-redesign-proj/after-agents2-implementation-plan/artifact.json` |
| `claim` | changed — keep exhibit and numbering; remove claim comment button | `node-redesign-proj/after-agents2-implementation-plan/artifact.json` |
| `call-stack` | keep — annotated call outline | `project-atlas/diagram-gallery/artifact.json` |
| `state-machine` | keep — lifecycle and screen transitions | `node-redesign-proj/after-agents2-implementation-plan/artifact.json` |
| `mockup` | keep — framed UI explanation | `node-redesign/every-node/artifact.json` |
| `wireframe` | keep — bounded mockup building block | `node-redesign/every-node/artifact.json` |
| `decision` | keep — explicit choices, separate from comments | `project-atlas/agent-skills-distribution/artifact.json` |
| `execution-trace` | changed — wider reading area and container-aware stack/detail split | `pi-extensions/cursor-shell-tool-card-trace/artifact.json` |
| `file-tree` | keep — useful CLI directory map, not a substitute for a walkthrough | `agents/visual-artifact-cli-implementation/artifact.json` |
| `image` | keep — screenshots and assets | `fue-agent/fue-agent-diff-review-4506459/artifact.json` |
| `mermaid` | keep — specialised diagrams outside map/sequence | `agents/agents-repo-cheat-sheet/artifact.json` |
| `svg-diagram` | keep — sandboxed specialised exhibit | `agents/agent-infrastructure-constellation/artifact.json` |

## Removed nodes

Dropped: `text`, `heading`, `section`, `card`, `grid`, `tabs`, `accordion`, `stat-card`, `metric`, `badge`, `button`, `separator`, `alert`, `status-grid`, `comparison-table`, `data-table`, `definition-list`, `flow`, `stepper`, `box-diagram`, `sequence-diagram`, `code-block`, `diff`, `log`, `chart`, `area-chart`, `radar-chart`, `scatter-chart`, `pie-chart`, `donut-chart`, `heatmap`, `change-stats`, `quotes`.

Their schema branches, manifest entries and renderer adapters are gone. Historical usage includes `agents/visual-artifact-cli-implementation/artifact.json`; those old bundles are not promised compatibility. Shared low-level UI primitives are not advertised artifact types.

## Page and feedback decisions

- Content max width: **80rem (1280px)** instead of 72rem. Text keeps its own measure; exhibits get the available width.
- Feedback at 1280px and above: **22.5rem (360px)** column. Below 1280px: a **50dvh** bottom sheet; no subtraction from reading width.
- Execution trace: split stack/detail only when its own container reaches **60rem**; stack vertically below that threshold.
- Map: show a labelled connection list below **44rem** rather than shrink a diagram until labels cannot be read.
- New node types: **none**. Better code-walkthrough composition remains a follow-up, not speculative scaffolding in Cycle 0.
- Feedback persistence: the worktree's development handler writes annotation files atomically instead of relying on a fixed-port proxy.
- Copy Markdown: export every comment body and its node path, including comments nested in surviving containers.

## Verification

The required gate passed: shared build, app lint, TypeScript, **202 app tests**, contract export, production build and **318 CLI tests**. Generated manifest examples and tracked canonical fixtures also passed `verify:artifacts` with an explicitly empty runtime-store override.

Default `pnpm verify:artifacts` fails on old local bundles such as `artifacts/visualizer/call-stack-excerpts/artifact.json`, because major 3 intentionally rejects their removed nodes. Those bundles were not modified or migrated.

### Limits

DOM tests, static CSS assertions and type checks are not visual acceptance. No browser was opened. Port 9991 was occupied by a process belonging to another worktree; its responses were not used as evidence for this branch. The real examples above still need visual checks at 390px, 1280px and wider desktop sizes, including feedback open and reduced motion.
