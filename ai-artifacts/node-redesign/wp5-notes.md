# WP5 notes (skill, docs, AFTER examples)

## Owned files changed
- `skill/SKILL.md`: rewritten around core nodes, 10 anti-box rules, five shape recipes, self-check. Legacy types appear only in a "Do not use" table.
- `skill/references/content-types/recipes.md`: new. Skeletons for the five shapes.
- `skill/references/**`: `design-guidelines.md`, `content-types/{_index,architecture-diagrams,dashboards,timelines,data-organization,plans}.md`, `direct-artifact/_index.md`, `architecture-overview/visualization-strategy.md` updated. No legacy node names remain.
- `ai-artifacts/docs/nodes.md`: regenerated from `cli/assets/contract.json` (31 nodes plus the legacy table). 
- `ai-artifacts/docs/DESIGN.md`: node philosophy, anti-box rules and editorial tokens replaced; change-semantics section kept with node names updated.
- `ai-artifacts/node-redesign/gallery.md`, `examples/after/1..5-*.json`.

## AFTER examples
All five validate with `bun run cli/src/main.ts validate`, and are in the store under project `node-redesign`: `after-agents2-week-2026-10-04`, `after-compaction-design`, `after-agents2-implementation-plan`, `after-skill-distribution-decision`, `after-tool-ui-status`. Screenshots: `wip/wp5-<n>-{light,dark}-{desktop,mobile}.png`. Example 1 carries the full content of the real weekly report.

## Skill findings (what a spec-writer hits)
- `prose` has no `size` prop; first draft failed validation. Recipes say "lead paragraph = plain prose".
- `compare` bodies cap at 600 characters, `ledger` bodies at 280. Long source paragraphs had to be split or moved to `details`.
- A chapter takes one body node, but it is easy to want two (steps plus table). I used `details` for the second.
- `table` `columns` accept `{key,label}` objects or strings; `onlyDiffs` exists.
- Cloud-only shapes with ≥5 nodes needed a `map` split, so I used `story` beats instead.

## Gaps for the lead
- At screenshot time WP3 adapters (`steps`, `map`, `story`, `sequence`) were stubs. Those appear as plain lines. Re-shoot once WP3 lands.
- `prose` inside `columns` renders `###` headings as small caps labels; works, but verify when WP4 settles.

## Verify
`pnpm lint` clean. `pnpm test`: 163 pass, 0 fail.
