# WP0 notes: contract and schema

Status: done, uncommitted. Contract 2.0.0.

## Where things live
- Props schemas: `shared/src/editorial-schemas.ts` (all 16 new nodes, limits, `SPLIT_MAP_MESSAGE`, `SafeHrefSchema`).
- Union and cross-checks: `shared/src/artifact-schema.ts` (`columns` children must be prose/figures/checklist/links/quote).
- Type lists, manifest, patterns, legacy: `shared/src/contract.ts`
  (`CORE_NODE_TYPES`, `SPECIALISED_NODE_TYPES`, `ARTIFACT_NODE_TYPES`, `LEGACY_NODE_TYPES`, `findLegacyNodeWarnings`).
- `sequence` alias: `SequencePropsSchema` in `shared/src/plan-schemas.ts` (max 10 steps, optional `key: number[]`). `code` reuses `CodeBlockPropsSchema`.
- CLI warns (never rejects) in `create` and `validate` via `legacyNodeWarnings` in `cli/src/validate.ts`.
- Tests: `app/src/lib/contract/editorial-nodes.test.ts`.

After a shared change, rebuild and copy `shared/dist` into
`app/node_modules/.pnpm/@agents+visual-artifact-annotations@file+..+shared/node_modules/@agents/visual-artifact-annotations/dist`
(pnpm injected dep), or run `pnpm install` in `app/`.

## Stub adapters (`app/src/components/adapters/editorial/`)
| Node | File | Export | Notes |
|---|---|---|---|
| chapter | chapter-adapter.tsx | `renderChapter` | children + takeaway |
| columns | columns-adapter.tsx | `renderColumns` | |
| callout | callout-adapter.tsx | `renderCallout` | |
| details | details-adapter.tsx | `renderDetails` | |
| ledger | ledger-adapter.tsx | `renderLedger` | literal + data-backed (groupKey grouping already done) |
| checklist | checklist-adapter.tsx | `renderChecklist` | |
| figures | figures-adapter.tsx | `renderFigures` | |
| table | table-adapter.tsx | `renderEditorialTable` | delegates to old `renderTable`; new props ignored |
| steps | steps-adapter.tsx | `renderSteps` | |
| map | map-adapter.tsx | `renderMap` | lists nodes/edges via `normalizeBoxEdges` |
| story | story-adapter.tsx | `renderStory` | |
| compare | compare-adapter.tsx | `renderCompare` | already hides identical rows |
| timeline | timeline-adapter.tsx | `renderEditorialTimeline` | data form -> old `renderTimeline`; items form plain list |
| trend | trend-adapter.tsx | `renderTrend` | first series via old `renderChart` |
| links | links-adapter.tsx | `renderLinks` | |
| quote | quote-adapter.tsx | `renderQuote` | |

Registry (`component-registry.tsx`): also `code` -> `renderCodeBlock`, `sequence` -> `renderSequenceDiagram`. `adapters/index.ts` re-exports all.
Workers: replace the body only; keep file name and export name. Do not edit the registry or index (lead owns them).

## Prop shapes
See each manifest entry in `shared/src/contract.ts` (`pnpm exec visual-artifact contract` after bootstrap). Key limits:
chapter kicker≤40 title≤80 deck≤200 takeaway≤160; columns 2-3 text children; callout body≤400;
ledger 1-4 groups x 1-12 rows (title≤60 body≤280 next≤140); data form needs dataKey/titleKey/bodyKey/groupKey;
checklist 1-20; figures 1-4; steps 2-7; map 2-6 nodes, ≤8 edges ("Split into two maps or use steps.");
story diagram ≤8 nodes, 2-7 beats whose show/focus ids must exist; sequence ≤10 steps; timeline items 2-12;
links 1-8; trend y ≤3 series, ≤3 marks. Table props: old `dataKey/columns/caption` still valid, plus `dense/statusKey/highlightKey/onlyDiffs`.
Timeline data form accepts v1 `markerKey/descriptionKey/statusKey` and v2 `whenKey/bodyKey/signalKey`.

## Verification
- `pnpm test` 157 pass, `pnpm lint` clean, `pnpm export:contract` done, `pnpm verify:artifacts` ok, shared + app + cli `tsc --noEmit` clean.
- Real store (`~/.agents/skills/visual-artifact/artifacts`): 168 specs, 2 fail, identical on baseline (HEAD) schema:
  `pi-token-tank/openai-usage-percentage-call-stack` (execution-trace event shape) and
  `var-lesson-explainers/llm-quantization-explained` (type `annotated-visual`, not in any contract). No regression; not fixed (out of scope).

## Caveats
- Legacy `text` is the only old type mapped to `prose`; `prose` itself was already in the contract.
- verify script now checks manifest = advertised + legacy, and each legacy `replacedBy` is advertised.
- `report-direction.ts` enum grows with `ARTIFACT_NODE_TYPES`; behaviour unchanged.
