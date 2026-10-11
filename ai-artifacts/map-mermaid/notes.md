# map-mermaid notes

## Changes (all uncommitted)
- `app/src/lib/diagram/map-to-mermaid.ts` (+ test): pure compiler from map JSON to Mermaid flowchart. Escapes user text, wraps edge labels, picks LR/TB, reverses cycle-closing edges.
- `app/src/components/mermaid/map-mermaid.tsx`: renderer built on the shared render queue and theme. Edge colour/dash are applied in the DOM (Mermaid `linkStyle` cannot use CSS variables). Crops the viewBox to content.
- `mermaid-diagram.tsx`: exports `enqueueMermaidRender`, `renderMermaidSvg`, `useDocumentTheme` (observes `<html class>`, so the light/dark toggle re-renders).
- `map-adapter`, `box-diagram-adapter` (grid and groups ignored), `story-adapter` (beats toggle opacity on `data-mm-node` / `data-mm-edge`; `focusCrop` dropped; reduced motion shows everything, no sticky).
- `globals.css`: `.mm-*` styles (no fills, hairline rules, serif titles, no shadows).
- Deleted `map-layout.ts`, `label-placement.ts`, and three test files. `estimateTextWidth` moved to `lib/diagram/text-width.ts`; map code removed from `plan/diagram-svg.tsx`.
- `map` schema untouched. Verified: lint, test (189 pass), export:contract, verify:artifacts, build.

## Screenshots
`ai-artifacts/map-mermaid/after/` (4 pages, light/dark, desktop/mobile).

## Open issues
- "The agent toolchain" map is in `project-atlas-overview`, not `agents2-how-it-works` (that page has a legacy box-diagram, which renders cleanly).
- Mobile: maps keep natural size and scroll sideways; text floor is 14px (fit scale min 0.93). On desktop, a map wider than the column (gallery "parts and flows", ~1000px vs 828px) is clipped and scrolls rather than shrinking.
- Hub layout (toolchain) is LR with fan-out edges; no crossings, but diagonal edges are long.
- Story: `fitWidth` 460; two-column sticky stage at >=1100px, stacked sticky stage below.
- Dark-mobile page overflow seen earlier is gone (all mobile shots are 390px wide).
- `AGENTS.md`/`CLAUDE.md` show as untracked in `app/` (pre-existing, not mine).
