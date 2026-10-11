# Node redesign gallery

Before and after for the five source documents. Before specs are in `examples/before/`, after specs in `examples/after/`. After specs were written from `skill/SKILL.md` and its references only, then validated with `visual-artifact validate`.

Screenshots: `after/<n>-<shape>-{light,dark}-{desktop,mobile}.png` (`1-weekly-report`, `2-design-explainer`, `3-implementation-plan`, `4-decision-comparison`, `5-status-board`). Live: `http://127.0.0.1:9990/node-redesign/<slug>/`.

| # | Shape | Before spec | After spec | Slug | What changed |
|---|---|---|---|---|---|
| 1 | Weekly report | `1-weekly-report.json` | `1-weekly-report.json` | `after-agents2-week-2026-10-04` | Six numbered sections became chapters with a takeaway each. Card grids became `columns` and `compare`. Two box diagrams became `map`. Open loops became a grouped `ledger`. |
| 2 | Design explainer, data flow | `2-design-explainer-data-flow.json` | `2-design-explainer-data-flow.json` | `after-compaction-design` | The core flow is one `story` with five beats. Stage data moved into `details`. Evidence is `figures` plus two `callout`s. |
| 3 | Implementation plan | `3-implementation-plan.json` | `3-implementation-plan.json` | `after-agents2-implementation-plan` | One chapter per milestone with a `checklist`. Risks are a grouped `ledger`. |
| 4 | Decision or comparison | `4-decision-comparison.json` | `4-decision-comparison.json` | `after-skill-distribution-decision` | Problem as `ledger`, options as `table` with `onlyDiffs`, recommendation as `compare` and `steps`, five questions as `decision` nodes. |
| 5 | Status board | `5-status-open-loops.json` | `5-status-open-loops.json` | `after-tool-ui-status` | Tiles became `figures`. Open loops are a `ledger` grouped by what to do. The full inventory is a dense `table` in `details`. |

## What to look for

- No card, tile or bordered container around ordinary content.
- Each chapter: a mono kicker, a serif title, one deck line, one body node, one takeaway.
- Status as a dot plus a word. At most three signal colours.
- Diagrams of 6 nodes or fewer, each with a caption.

## Content parity

Each after spec keeps the content of its before spec. Plan 3 keeps the `claim-tree` spine, both `decision` nodes, the M2 `state-machine`, the M3 `sequence`, an acceptance line per milestone and a Do now / Do later / Do not ledger. Status board 5 keeps open loops, the family table, the review matrix and collapsed/expanded behaviour (in `details`), with a "Not verified" callout. Explainer 2 keeps the evidence table, verification ledger and fit policy.

Chapter rule: one main exhibit, plus at most one supporting `prose`, `details` or `callout`.

## Known gaps

- Shots were taken against the dev server at the time of writing; re-shoot after any adapter change.
- Plan 3 is long because it keeps every before-spec fact. The `claim-tree` collapses to its claim titles in the contents rail.
