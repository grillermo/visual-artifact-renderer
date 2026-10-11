# WP2 notes: rows and lists

Status: done, uncommitted.

## Files
- `adapters/editorial/{ledger,checklist,figures,table,callout,details,links,quote}-adapter.tsx` rewritten (same names and exports).
- New `adapters/editorial/rows/signal.tsx`: signal text/rule classes, signal icons, `LABEL_CLASS`.
- `adapters/data-adapters.tsx`: `table`, `data-table`, `comparison-table` render through `TableView`; `status-grid` renders through `LedgerView` grouped by status (risk, wait, new, done), one hint per signal.
- Exports other workers can reuse: `LedgerView`, `LedgerGroup` (ledger-adapter), `TableView` (table-adapter).
- Test: `adapters/editorial/rows/rows.dom.test.tsx` (6 tests).
- Fixture: `wip/wp2-spec.json`, created as `node-redesign/wip-wp2` in the local store. Screenshots `wip/wp2-{light,dark}-{desktop,mobile}.png`.

## Behaviour
- Ledger: group header = icon + mono caps label in the signal colour, muted hint, hairline rows, serif 19px title, `minmax(10ch,16rem) 1fr` grid (stacks under 640px), `Next:` run-in, right-aligned mono `meta`, optional `href` on the title. No pills, no row borders, colour only on the group label.
- Checklist: glyph per state (filled, half, ring, orange triangle, struck text); the word only in `aria-label`.
- Figures: serif 44px tabular numerals, mono caps label, optional 64x16 sparkline, hairlines above and below, 2x2 on mobile.
- Table: no outer border, mono caps head with a strong rule, serif first column, `statusKey` dot + word, `highlightKey` accent tick (column hidden), `onlyDiffs` drops uniform columns (never the first), stacked label/value blocks under 720px.
- Callout: 3px left rule + icon + title, no fill. Details: chevron + underlined summary. Links: inline underlined row. Quote: serif italic pull quote with a rule and mono source line.

## Caveats
- Legacy `data-table`/`comparison-table` now share the new look; old `comparison` mobile cards are gone.
- Legacy status-grid status text becomes the group label (e.g. "WARN", "FIXED"), as authored.
- `Prose` inside ledger rows and callouts uses the shared `.prose` class; its own paragraph margins are zeroed locally.
- `tsc` errors seen outside my files: `trend-adapter.tsx` (label props typing) and `leaf-adapters.tsx:269` (`size` on prose props). Not mine.

## Verify
`pnpm lint` clean, `pnpm test` 163 pass, 0 fail.
