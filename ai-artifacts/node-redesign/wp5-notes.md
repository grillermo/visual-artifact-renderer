# WP5 notes (skill, docs, AFTER examples)

## Owned files changed
- `skill/SKILL.md`: rewritten around core nodes, 13 rules (anti-box, say it once, vary rhythm, recommended first), five shape recipes, self-check. Legacy types appear only in a "Do not use" table.
- `skill/references/content-types/recipes.md`: new. Skeletons for the five shapes.
- `skill/references/**`: `design-guidelines.md`, `content-types/{_index,architecture-diagrams,dashboards,timelines,data-organization,plans}.md`, `direct-artifact/_index.md`, `architecture-overview/visualization-strategy.md` updated. No legacy node names remain.
- `ai-artifacts/docs/nodes.md`: regenerated from `cli/assets/contract.json` (31 nodes plus the legacy table). 
- `ai-artifacts/docs/DESIGN.md`: node philosophy, anti-box rules and editorial tokens replaced; change-semantics section kept with node names updated.
- `ai-artifacts/node-redesign/gallery.md`, `examples/after/1..5-*.json`.

## AFTER examples
All five validate with `bun run cli/src/main.ts validate`, and are in the store under project `node-redesign`: `after-agents2-week-2026-10-04`, `after-compaction-design`, `after-agents2-implementation-plan`, `after-skill-distribution-decision`, `after-tool-ui-status`. Screenshots: `after/<n>-<shape>-{light,dark}-{desktop,mobile}.png` (shapes: weekly-report, design-explainer, implementation-plan, decision-comparison, status-board). Specs keep the content of their before specs (plan 3 has the claim-tree, both decisions, state machine, sequence and a Do now/later/not ledger). Example 1 carries the full content of the real weekly report.

## Skill findings (what a spec-writer hits)
- `prose` has no `size` prop; first draft failed validation. Recipes say "lead paragraph = plain prose".
- `compare` bodies cap at 600 characters, `ledger` bodies at 280. Long source paragraphs had to be split or moved to `details`.
- Chapter rule: one main exhibit, plus at most one supporting prose, details or callout. Extra exhibits get their own chapter.
- `mermaid` and `svg-diagram` are not a way around `map`/`steps` limits; split instead.
- `table` `columns` accept `{key,label}` objects or strings; `onlyDiffs` exists.
- Cloud-only shapes with ≥5 nodes needed a `map` split, so I used `story` beats instead.

## Rounds 2 to 4
- Round 2: content parity for examples 2, 3 and 5; chapter rule and core/specialised lists aligned between SKILL and contract (`links`, `quote` specialised); contract re-exported.
- Round 3: shorter plan checklists, no repeated openings, fewer kickers and takeaways, recommended option first (`highlightKey: pick`) in example 4.
- Round 4: 844px first-screen rule measured at 390px: steps 813, story 827, claim-tree 724, ledger 808, figures 760. Examples 1, 2 and 5 were shortened to pass.

## Gaps
- Examples 1, 2 and 4 pass the 844px rule by under 40px.
- Chapter `emphasis` is not used in the examples.
- Final reshot screenshots were not reviewed by eye.

## Verify
See the coordinator report for the latest lint, tsc and test results.
