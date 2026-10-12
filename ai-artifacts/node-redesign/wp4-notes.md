# WP4 notes

Status: done, uncommitted. `pnpm lint` clean, `tsc --noEmit` clean, `pnpm test` 163 pass.

## Built
- `chapter`: kicker, 20ch serif title, 52ch deck, children, pull-line takeaway (signal rule). Registers via `useChapterRegistry`, `id` = `chapter-<slug>-<nodePath>`. Rail shows all three chapters in the fixture.
- `columns`: top hairline per column, `###` heading in a child prose becomes a mono caps label, stacks under 720px.
- `compare`: two labelled sides with one vertical rule; before/after tints the right label green. `rows` show only differing rows, others counted ("2 things stay the same"). Mobile stacks with inline labels.
- `timeline`: spine, mono `when` gutter, signal dots, serif titles. Data form maps v1 and v2 keys; status text maps to signals.
- `trend`: bare recharts, horizontal hairline grid only, series labelled at line end (no legend), `mark` reference lines, up to 3 series, line or bar.
- Legacy `card`/`grid`/`section`: bare (hairline above, no surface). `section` renders like a chapter without registering.
- `prose`: lists where every item starts `**Label:**` become hairline label rows; inline code chips without backticks. No `size` prop exists in the prose schema, so `lead` is not implemented.
- `code`: flat `--code-bg`, no border or shadow; header still sits inside the surface (title outside was not done).
- `decision`: option rows with radio, serif label, "suggested" mono tag, consequence line.
- `plan-ui`: `PlanFrame` loses border; `PlanHeader` is a mono caps rule header; `PlanCaption` plain. This also de-boxes sequence, call-stack and box-diagram frames (WP3 owns those files).
- `summary-adapters`: `change-stats` one inline line with signal colours; `quotes` as `details` with pull quotes.
- Claim tree: serif title, hairline list, no card, brand colour for decision counts.

## Evidence
Fixture: `wip/wp4-spec.json` (store: node-redesign/wip-wp4). Screenshots: `wip/wp4-{light,dark}-{desktop,mobile}.png`.

## Caveats
- Fixture `columns` children use `###` headings; that is the only way the label appears.
- Code title is still inside the grey surface (spec wanted it above). Changing it needs `ui/code-block.tsx` (not owned).
- Mobile timeline gutter is 5rem; long `when` strings wrap.
- Claim tree and mockup were not visually checked beyond type checks.
