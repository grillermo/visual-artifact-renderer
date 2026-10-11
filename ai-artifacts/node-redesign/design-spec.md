# Node redesign: design spec

Status: draft for review. Sources: `brief.md`, the design review at
`~/dev/personal/tools/agents2/ai-artifacts/explainer-design-alternatives/` (report.html, mockup.html, cur-*.png),
the article-explainer, better-ui, emil-design-eng and frontend-design skills, the current contract
(`shared/src/contract.ts`, `shared/src/artifact-schema.ts`, `shared/src/plan-schemas.ts`), and the adapters.

## 0. The problem in one paragraph

The page looks generic because it is built from boxes, and the renderer puts boxes inside them.
`Figure` (`app/src/components/artifact-primitives.tsx:30-34`) always adds a border, a radius and a shadow.
`status-grid`, `flow` and the tables then draw their own bordered cards inside it. That gives four border
levels on one screen. Every section has the same shape: heading, caption, dark panel, small text. Nothing
stands out and no theme has its own form. On top of that, five renderer bugs make the boxes look broken:

| Defect | Cause | Where |
|---|---|---|
| Words split mid-word ("stop / s", "th / eme") | `break-all` on prose text | `data-adapters.tsx:98,157,219,268,289`; also `ui/stepper.tsx:78`, `ui/definition-list.tsx:25` |
| Every status has the same pink border; WARN and PENDING differ only by a grey pill | `statusPanelClass` maps text to tone, then the card adds `border-[1.5px]` over it | `lib/artifacts/status.tsx:79`, `data-adapters.tsx:~110-165` |
| Card in a card | `Figure` always adds a border and shadow | `artifact-primitives.tsx:30-34` |
| Edge labels hidden behind nodes ("agentMod…") | Label centred on the edge midpoint, no overlap check | `adapters/plan/diagram-svg.tsx:48` (EdgeLabel), `box-diagram-adapter.tsx:120` |
| Card title smaller than card body (16 px vs 18 px) | `size="sm"` shrinks the title but not the prose | `ui/card.tsx:45`, `ui/prose.tsx:47` |

The spec also caused problems: 9-node box diagrams, six unlike items in one grid, numbered headings, and
lists written as paragraphs. The new skill text has to prevent those. Renderer fixes alone will not.

Target look: the review's `mockup.png`. It uses hairlines and white space instead of cards, a section
kicker, a big serif title and one plain-sentence deck line. It has a horizontal step line with two green
steps that matter, a pull-quote takeaway, and open loops grouped as "Can break something" and "Waiting on you"
in hairline ledger rows with an icon and coloured label per group.

## 1. Critique of current nodes (48 types)

Verdicts: **keep** (as is or with a small fix), **rewrite** (new visual, same job), **merge** (folded into a
new node), **legacy** (still parses and renders old specs, hidden from the agent contract).

| Node | Verdict | Reason |
|---|---|---|
| `text` | merge → `prose` | Two paragraph nodes is one too many. |
| `prose` | keep + fix | Core voice. Fix size hierarchy and allow run-in bold labels. |
| `heading` | legacy | `chapter` owns headings now. Free headings break the rhythm. |
| `section` | rewrite → `chapter` | Today it is a separator plus heading. It needs a kicker, a deck line, a takeaway and a TOC entry. |
| `card` | legacy | This is the box. Nothing in the new set needs a generic container. |
| `grid` | legacy | Grids of cards are the main anti-pattern. `columns` replaces it for text side by side. |
| `tabs` | legacy | Hides content and fails ADHD scanning. Use `compare` or `ledger` groups instead. |
| `accordion` | rewrite → `details` | Keep one quiet "more detail" disclosure. Never use it for the main point. |
| `stat-card` | legacy | KPI tiles create number-heavy box rows. Use `figures` instead. |
| `metric` | merge → `figures` | Same job, no box. |
| `badge` | legacy | A loose pill with no meaning. Status uses dot plus word inside rows. |
| `button` | merge → `links` | Links are text. A "Sources" row covers it. |
| `separator` | legacy | Chapters draw their own rule. A free separator adds noise. |
| `alert` | rewrite → `callout` | Today it is a tinted bordered box. It becomes a margin note with a coloured left rule. |
| `status-grid` | legacy → `ledger` | Main complaint: card in card, one tone for everything, grey pills, mid-word breaks. |
| `comparison-table` | merge → `table` | Same table plus a status column. A table variant covers it. |
| `table` | rewrite | Hairline rows, no outer box, `break-words`, stacked rows on mobile. |
| `data-table` | merge → `table` (`dense: true`) | Same table, smaller text. |
| `definition-list` | merge → `ledger` | Term on the left, text on the right is a ledger row. |
| `flow` | rewrite → `steps` | Today it is five loose cards with no connectors, inside a card. It becomes a step line. |
| `stepper` | merge → `steps` | Same job. |
| `timeline` | rewrite → `timeline` | Keep the job. Draw a spine with dated ticks, not cards. |
| `box-diagram` | rewrite → `map` | Labels collide, canvas is mostly empty, text is 11 px, colours have no legend. Rebuild it as a label-safe map limited to 6 nodes. |
| `sequence-diagram` | keep + restyle | Clearest component on the page. Drop the dotted canvas panel, raise label size, emphasise key steps. |
| `state-machine` | keep (plan set) | Specialised; useful for plans. Restyle it to drop the outer panel. |
| `mermaid` | keep, discouraged | Escape hatch for ERD and class diagrams. The skill says prefer `map` or `sequence`. |
| `svg-diagram` | keep as escape hatch | Full control when `map` cannot do it. Bare, no Figure border. |
| `chart` | rewrite → `trend` | Line or bar, bare, direct labels at line ends, no legend box. |
| `area-chart`, `radar-chart`, `scatter-chart`, `pie-chart`, `donut-chart`, `heatmap` | legacy | Rarely the right answer for explainers. Pie, donut and radar mislead. `trend` and `bars` cover the rest. |
| `log` | legacy | Use `code` with language `log`. |
| `diff` | merge → `code` (`diff: true`) | `code-block` already supports diff lines. |
| `code-block` | keep, rename `code` (alias kept) | Good. Strip outer card, keep annotations. |
| `file-tree` | keep | Real job: show where files live. Restyle as a plain indented list with hairline guides. |
| `image` | keep | Needed for screenshots. Bare, caption under it. |
| `execution-trace` | keep (specialised) | Code-review tool with its own verification. Out of scope for restyle beyond removing the outer Figure. |
| `call-stack` | keep | Terse and readable. Remove the panel. |
| `claim-tree`, `claim` | keep | The plan spine is already editorial. Align it with chapter typography. |
| `decision` | keep + restyle | Option cards → option rows with a radio dot and consequence line. |
| `mockup`, `wireframe` | keep | Framed UI is a real need. The frame is the one allowed surface. |
| `change-stats` | merge → `figures` | One line of numbers. |
| `quotes` | rewrite → `quote` | Pull-quote typography for one quote. A list of quotes is a ledger with `via`. |

Result: 48 types in the agent contract become **18**. The rest stay parseable as legacy (see section 5).

## 2. The new node set (18)

### Global anti-box rules (renderer enforces them, the skill repeats them)

1. **One surface at most.** Only `mockup` frames, `code` and `callout` (a left rule only) may draw a
   surface. No node draws a full border around another node. `Figure` loses its border and shadow by default
   (`bare` becomes the default; `framed` is opt-in for legacy adapters only).
2. **Separate with hairlines and space, not borders.** Rows use a 1 px `--rule` top border. Groups use
   space plus a coloured label.
3. **Status = dot (or icon) + word, inline.** Never a filled or bordered pill. Grouping by status comes
   before colouring by status.
4. **Colour is a signal.** Use at most three semantic hues per page plus ink: `--signal-new` (green, the new
   idea), `--signal-risk` (orange, can break), `--signal-wait` (blue, waiting on someone). Each one also has
   an icon or line-style cue, so colour is never the only cue.
5. **No mid-word breaks.** Text uses `overflow-wrap: anywhere` only on code and paths. Prose uses
   `break-words` (`overflow-wrap: break-word`) plus `text-wrap: pretty`. Row title columns use
   `min-width: 10ch` so short words never wrap per letter. Delete every `break-all` from prose.
6. **The title is always bigger than the body.** Row titles use 18 px serif and bodies use 16 px sans. No
   inverted hierarchy.
7. **Diagrams have hard limits.** `map` allows 6 nodes, `steps` 7 and `sequence` 10 steps, enforced by
   the Zod schema. The error tells the agent to split the diagram.
8. **Every chapter gets one takeaway.** Give the quotable line its own typography instead of putting it in
   a box.

### Node reference

Props use the contract's terse style. `?` means optional. Every node accepts `metadata.id`.

#### Page structure

**1. `chapter`** (container, replaces `section`)
```
props: { kicker?: string≤40, title: string≤80, deck?: string≤200, takeaway?: string≤160,
         signal?: "new"|"risk"|"wait" }   children: nodes
```
- Visual: kicker in mono caps 12 px with tracking .14em, muted. Title in serif 40/44 (32 on mobile), max
  20ch. Deck in sans 20/30, max 52ch, muted ink. Children follow. The takeaway renders last as a pull line:
  serif italic 22/32, with a 3 px left rule in `signal` colour (default ink). A full-width 1 px rule
  separates chapters; there is no rule above the first chapter.
- No numbered headings. The kicker does that job ("Theme 3 of 6" is allowed but discouraged).
- Each chapter registers in the page rail (rule P4).
- Mobile: same order, title 32 px, takeaway 19 px.

**2. `prose`** (keep)
```
props: { content: markdown, tone?: "default"|"muted", size?: "lead"|"base" }
```
- 18/30 sans, max 66ch. `lead` = 20/32. Paragraphs that start with `**Label:**` render the label as a run-in
  bold label. A markdown list renders as rows with hairlines when every item starts with `**Label:**`.
  That turns "Roles: A does x, B does y…" into scannable lines.

**3. `columns`** (container, replaces `grid` for text only)
```
props: { count?: 2|3 }   children: prose|figures|list-like leaves only (no diagrams, no columns)
```
- Columns with a 1 px top rule and a 32 px gutter. No borders between or around columns. Child prose
  gets a mono caps label when its markdown starts with a `### heading` (renders like mockup's
  "COMPACTION MODEL" trio).
- Stacks to one column under 720 px.

**4. `callout`** (rewrite of `alert`)
```
props: { tone: "note"|"risk"|"new"|"wait", title?: string≤80, body: markdown≤400 }
```
- No background fill and no border box. A 3 px left rule in the tone colour, a tone icon (info, triangle,
  sparkle, clock) and a title in 15 px semibold. Body is 16 px. Indented 20 px.
- Max two per chapter (soft rule in the skill).

**5. `details`** (rewrite of `accordion`)
```
props: { summary: string≤80 }   children: nodes
```
- One line: chevron plus underlined summary text in muted ink. Content opens below with no surface.
  Use it for evidence, never for the main point.

#### Status and lists

**6. `ledger`** (replaces `status-grid`, `definition-list`, quote lists)
```
props: { caption?: string,
         groups: { label: string≤40, signal?: "risk"|"wait"|"new"|"done"|"none", hint?: string≤80,
                   rows: { title: string≤60, body: markdown≤280, next?: string≤140, meta?: string≤40,
                           href?: https }[] 1-12 }[] 1-4 }
```
- Group header: icon plus mono caps label coloured by `signal` (for example "△ CAN BREAK SOMETHING" in orange),
  with a muted hint line under it ("Fix these first."). Group order is the author's order. The skill says:
  put what can break first.
- Rows: a 2-column grid, `minmax(10ch, 16rem) 1fr`. Title in serif 19 px, body in sans 16/26, and a
  `Next:` run-in line in 14 px muted. `meta` sits right-aligned in muted mono. Each row has a 1 px top rule,
  and the group closes with a final rule.
- **No pills, no per-row borders, no per-row colour.** Colour lives on the group label only. That is
  the fix for "nothing stands out".
- Data-backed variant: `{ dataKey, titleKey, bodyKey, groupKey, nextKey?, groupOrder?: string[], signals?:
  Record<group, signal> }`. Use it so the weekly report's existing `loops` data maps directly.
- Mobile: the title stacks above the body and the indent goes away.

**7. `checklist`** (replaces status chips in tables, `stepper` for status)
```
props: { items: { text: string≤140, state: "done"|"doing"|"todo"|"blocked"|"dropped", note?: string≤140 }[] 1-20 }
```
- One line per item. A state glyph comes first: filled dot for done, half dot for doing, ring for todo,
  orange triangle for blocked, strikethrough text for dropped. Words appear only in the screen-reader label.
  This makes "what's done / what's left" scannable.

**8. `figures`** (replaces `stat-card`, `metric`, `change-stats`)
```
props: { items: { value: string|number, label: string≤40, note?: string≤80, trend?: number[]≤24,
                  signal?: "new"|"risk"|"wait" }[] 1-4 }
```
- An inline band: big numerals in serif 44 px tabular, a label under each in mono caps, an optional 64×16
  sparkline after the value, and a hairline above and below the band. No tiles, no backgrounds. Max 4
  items, so "few numbers" is built in.
- Mobile: 2×2.

**9. `table`** (rewrite, absorbs `data-table` and `comparison-table`)
```
props: { dataKey, columns?: (string|{key,label?,align?,width?})[], caption?, dense?: boolean,
         statusKey?: string, highlightKey?: string, onlyDiffs?: boolean }
```
- No outer border. The header row uses mono caps 12 px muted with a 1 px ink rule under it, and body rows
  use hairlines. The first column is set in serif. `statusKey` renders a dot plus word. `highlightKey` (a
  boolean column) gives a row an accent left tick. `onlyDiffs` hides columns where every row has the same
  value. That fixes the "five rows all say FIXED" waste.
- `break-words` on cells and `min-width: 8ch` per column. Below 720 px, rows become stacked label/value
  blocks.

#### Explanation and data flow

**10. `steps`** (replaces `flow`, `stepper`)
```
props: { caption?: string, items: { title: string≤40, body?: string≤100, tag?: string≤24,
         key?: boolean }[] 2-7, direction?: "row"|"column" }
```
- Row: a horizontal line with a node marker per step (ring, or filled green when `key`). The line segment
  after a key step is also green. The title is 16 px semibold, the body 14 px muted, and `tag` is mono caps
  in the signal colour ("NEW ORDER"). Exactly like the mockup.
- Connectors are part of the line, so the steps read as a chain.
- Column direction (and auto under 720 px): a vertical spine on the left with markers and content to the
  right.
- The skill says to mark 1-2 steps as `key`, never all of them.

**11. `map`** (replaces `box-diagram`; label-safe, limited to 6 nodes)
```
props: { caption: string, nodes: { id, label≤28, sub?≤40, kind?: "actor"|"service"|"store"|"file"|"external",
         signal?: "new"|"risk"|"wait" }[] 2-6,
         edges: ("a -> b : label" | "a --> b" | "+ a -> b")[] ≤8, layout?: "row"|"column"|"hub",
         legend?: { solid?: string, dashed?: string } }
```
- Nodes are text labels with a small kind glyph and a hairline underline. They are not filled boxes. The
  `signal` colours the label text and glyph. A legend is generated automatically from the signals used and
  shown as dot plus word under the diagram.
- Layout is computed rather than placed on a grid: `row` (pipeline), `column` or `hub` (centre plus spokes).
  Node spacing is at least 1.5 × max label width, so every edge has room for its label.
- **Label placement fix** (shared in `diagram-svg.tsx`): measure each edge label (via `getBBox` after
  mount, or a char-width estimate for static export). Try positions in order: above the midpoint, below it,
  then at 30% and 70% along the edge. Pick the first that does not intersect any node rectangle inflated by
  6 px or any other label. If none fits, wrap the label to 2 lines and retry. As a last resort, show a
  numbered marker on the edge and list the label under the diagram. The label never sits under a node.
- Text is 15 px sans, edge labels 13 px, ink at 80%. No dotted canvas, and the viewBox is cropped to the
  content plus 24 px. Width fills the measure.
- `+` prefix = proposed: dashed edge and `--signal-new` colour.
- More than 6 nodes is a schema error: "Split into two maps or use steps."

**12. `story`** (new: a diagram that assembles as the reader scrolls, from article-explainer)
```
props: { caption: string, diagram: map-props (nodes ≤8 here), beats: { text: markdown≤320,
         show: id[], focus?: id[] }[] 2-7 }
```
- Desktop at 1100 px or wider: two columns. A sticky diagram on the left at 80vh and beats on the right at
  about 60vh each. As each beat enters the viewport, the nodes and edges in its `show` list fade in and its
  `focus` nodes get the signal colour. Earlier elements stay visible. The motion is a single 300 ms opacity
  and stroke-dashoffset transition, with no bounce, and it is disabled under `prefers-reduced-motion`
  (the full diagram then shows at once).
- Mobile: the diagram sticks at the top at 44vh and the beats scroll under it.
- Use one per page, for the core data flow. Reuses `map` layout and label placement. It works as
  "Option B" inside the tool.

**13. `sequence`** (restyle of `sequence-diagram`; the old name stays as an alias)
```
props: as today + { key?: number[] } (step indices to emphasise), steps ≤10
```
- No panel or dotted canvas. Participant heads are text with a kind glyph and an underline. Labels are
  13 px sans instead of mono. Key steps are drawn in `--signal-new` and slightly heavier.

**14. `timeline`** (rewrite)
```
props: { items: { when: string≤24, title: string≤60, body?: string≤200, signal?: "new"|"risk"|"wait" }[] 2-12 }
       | { dataKey, whenKey, titleKey, bodyKey?, signalKey? }
```
- A vertical spine 1 px in ink at 30%. `when` sits in a left gutter in mono 13 px. A dot on the spine takes
  the signal colour. The title is serif 19 px. No cards.

**15. `compare`** (new: before/after and option comparison)
```
props: { mode: "before-after"|"options", left: { label, body: markdown }, right: { label, body: markdown },
         rows?: { aspect: string≤40, left: string≤120, right: string≤120 }[] ≤10, verdict?: string≤160 }
```
- Two columns under mono caps labels, with a 1 px vertical rule between them and no boxes. Before-after
  mode labels the left column "Before" in muted ink and the right column "After" in `--signal-new`. With
  `rows`, each aspect is a hairline row and **only differing rows render**; identical rows are counted in
  one muted line ("3 things stay the same"). `verdict` renders as the takeaway line.
- Mobile: rows stack as aspect → left → right, with column labels inline.

**16. `decision`** (restyle, keep schema)
- Options are rows instead of cards: a radio ring, the label in 17 px, and the consequence in muted 14 px.
  The suggested option gets a "suggested" tag in mono caps, accent colour. A decision record (ADR)
  is `chapter` plus `compare` plus `decision` (or `prose` once decided). There is no separate node.

#### Evidence

**17. `code`** (rename of `code-block`; `code-block`, `diff` and `log` stay as aliases)
- Keeps all props. The surface is a flat `--code-bg` with a radius of 8 px and no border or shadow. The
  title moves outside, above it, as mono caps.

**18. `trend`** (rewrite of `chart`)
```
props: { dataKey, x, y: string|string[] (≤3 series), kind?: "line"|"bar", caption: string, mark?: { x, label }[] ≤3 }
```
- Bare chart with no card or legend box. Each series is labelled directly at its line end. A `mark` adds
  an annotated vertical hairline ("compaction switched to Haiku"). Gridlines are horizontal only, in the
  hairline colour.

**Kept outside the 18, but still in the contract under a "specialised" group:** `claim-tree`, `claim`,
`call-stack`, `state-machine`, `mockup`, `wireframe`, `execution-trace`, `file-tree`, `image`, `mermaid`,
`svg-diagram`, `links` (`{ items: { label, href }[] }`, a plain inline row of underlined links). The
skill lists these after the core 18 with "use only when…" lines. Their only change is the bare `Figure` and
the `break-words` fix.

## 3. Page-level design system

**P1. Fonts.** `app/src/app/layout.tsx` loads Geist and Geist Mono. `--font-editorial` is a system serif
stack (`ui-serif, Georgia`). Keep that and do not add a webfont download. Use serif for display and row
titles, Geist for body, and Geist Mono for kickers, labels, `when` and code.

**P2. Type scale** (desktop / mobile, line height):

| Token | Use | Size |
|---|---|---|
| `display` | page title (hero) | 56/60 · 38/42 serif, `text-wrap: balance` |
| `h-chapter` | chapter title | 40/44 · 32/36 serif |
| `deck` | chapter deck, page lede | 20/30 · 18/28 sans |
| `pull` | takeaway | 22/32 · 19/28 serif italic |
| `row-title` | ledger/table first col | 19/26 serif |
| `body` | prose | 18/30 · 17/28 sans |
| `small` | row body, step body | 16/26 sans |
| `meta` | captions, notes | 14/22 sans muted |
| `label` | kickers, column heads | 12/16 mono caps, tracking .14em |

Add these as Tailwind `@theme` text tokens in `globals.css` (`--text-display` etc.) so adapters do not
hard-code sizes.

**P3. Colour tokens** (add to `globals.css`; keep the existing ivory, slate and clay base)

| Token | Light | Dark | Meaning |
|---|---|---|---|
| `--ink` | `#141413` | `#f2ede4` | text |
| `--ink-muted` | `#5e5d59` | `#a8a29a` | deck, body-secondary |
| `--rule` | `#e3dfd6` | `#2e2c28` | hairlines |
| `--rule-strong` | `#141413` | `#f2ede4` | chapter rule, table head |
| `--accent` | clay `#c4623f` | `#e08a69` | brand: links, suggested, focus |
| `--signal-new` | `#3f7d4e` | `#6fcf8e` | the new idea / key step |
| `--signal-risk` | `#c2571a` | `#f0904d` | can break something |
| `--signal-wait` | `#2f6db3` | `#7fb0ea` | waiting on someone |
| `--signal-done` | `--ink-muted` | `--ink-muted` | done is quiet, not green |
| `--code-bg` | `#f1eee7` | `#1c1b18` | the only fill |

All signal colours must reach at least 4.5:1 against the page background in both themes. Verify them in
WP1 tests. Map the old `tone` values (`success`, `warning`, `danger`, `accent`) to these in
`lib/artifacts/status.tsx` so legacy nodes also lose the pink.

**P4. Layout and rhythm.**
- Measure: prose max 66ch. Diagrams, ledgers and tables span the content column (max 960 px). The page
  container shrinks from `max-w-7xl` to 1120 px with the rail.
- Spacing on an 8 px base: 16 within a row, 32 between nodes in a chapter, 96 between chapters (64 on mobile).
- **Rail:** on screens 1200 px or wider, a sticky left mini-TOC (180 px) lists chapter titles in 14 px.
  The active chapter gets an ink tick and full ink; the others are muted. It uses
  `scroll-active-provider.tsx`. Below 1200 px, a "Contents" `details` sits under the hero.
- **Hero** (`visual-artifact-renderer.tsx` header): remove the bordered card. Use the kicker (artifact
  type and date), the display title, the description as the deck, and an optional chapter index of inline
  chapter titles separated by "·" (the review's "theme chips", as text, not chips).
- Radius: 0 for everything except `code` (8 px) and `mockup` frames. No shadows anywhere except popovers.
- Motion: only `story` and `details` animate. Hover changes colour only, with a 120 ms ease-out.

## 4. Mapping the five example shapes

**A. Weekly report** (`agents2-week-2026-10-04`)
- Hero with a 6-item chapter index.
- Each theme is a `chapter` (kicker "Memory", "Agents", …) with a deck, one body node and a takeaway.
  - Long sessions: `steps` with 5 items, where "Memory saves first" and "Next session" are `key`, plus
    `columns` with 3 labelled prose items. The `sequence` goes into `details`.
  - Team of agents: `map` limited to 5 nodes (profile → role → model), with roles as a `prose` row list.
  - Skills everywhere: `map` (hub layout).
  - Home vs work: `compare` in options mode with `rows` and only differences shown.
  - Toolchain that stops lying: `steps`, plus `ledger` "Claims vs reality" or `table` with `onlyDiffs`.
  - Herdr themes: `compare` before/after ("two writers, one file").
- Open loops: one `ledger` with groups "Can break something" (risk) and "Waiting on you" (wait). It uses
  the existing `loops` data through `groupKey`.

**B. Design explainer with data flow** (`pi-extensions/ai-artifacts/compaction-design`)
- `chapter` "How compaction works" containing one `story`: session → OptMem → compaction model → Haiku →
  summary, with 5 beats.
- `figures` (p90 114K, max 167K, limit 200K) with a sparkline of input sizes.
- `callout` (risk) "Haiku may not run today".

**C. Implementation plan** (compaction `03-plan.md`, agents2 `docs/plan.md`)
- `claim-tree` spine (kept) or chapters per phase.
- `checklist` per phase, `code` with `src` refs, and `decision` for open questions.
- `ledger` "Do now / Do later / Don't" groups. This is how the 7-column decision table becomes three
  groups: do now (new), do later (wait), don't (none).

**D. Decision / comparison** (ADR 0001, ADR 0002, agents2 `docs/decisions`)
- `chapter` "Context" with `prose`.
- `compare` in options mode for the considered options.
- Decision as the chapter takeaway, consequences as a `checklist`.
- Ownership splits (ADR 0002) become a `ledger` grouped by owner ("dotfiles", "agents2", "Mosaic").

**E. Status / open-loops board** (tool-ui-inventory, `docs/progress.md`)
- `figures` (≤4: total, done, blocked).
- `ledger` grouped by status signal, with blocked first.
- `checklist` for per-item progress and `table` (`dense`, `statusKey`) for the full inventory, inside
  `details`.

## 5. Contract migration

**Recommendation: keep old types renderable, remove them from the agent contract.** That matches your
lean, and here is why it is right:
- Stored artifacts under `~/.agents/skills/visual-artifact/artifacts/**` must keep rendering, and
  `verify:artifacts` checks them.
- Agents only see `visual-artifact contract`. When a type is missing from it, agents stop using it.

Mechanics:
1. `shared/src/contract.ts`: split the type list. `ARTIFACT_NODE_TYPES` = the 18 core plus specialised
   nodes, exported in the contract. `LEGACY_NODE_TYPES` = everything dropped. Add
   `ArtifactManifestEntry.legacy?: { replacedBy: string; hint: string }`. `createArtifactContract()`
   omits legacy entries from `nodes`, `nodeTypes` and `patternExamples`, and adds a short
   `legacy: Record<type, hint>` so an agent that remembers `status-grid` sees "use ledger".
2. `shared/src/artifact-schema.ts`: the Zod union keeps every legacy schema, so parsing is unchanged for
   old specs, and adds the new schemas. Aliases (`code-block`→`code`, `sequence-diagram`→`sequence`)
   should **not** be duplicated schemas. Keep the old name as the stored type and register the new name
   pointing at the same props schema.
3. CLI `create` (`cli/src/validate.ts`): **warn** but still accept, when a new spec uses a legacy type:
   `"status-grid is legacy; use ledger (groups by status)"`. Do not reject. A hard error would break
   agents running an older skill text mid-session. Revisit after one release.
4. Legacy adapters keep working but pick up the global fixes: `break-words`, a bare `Figure`, and new tone
   tokens. So `status-grid` stops breaking words even without migration. Optional: render `status-grid`
   through the `ledger` component by grouping on `statusKey`. That is cheap and fixes old weekly
   reports for free.
5. `pnpm export:contract` regenerates `cli/assets/contract.json`. Bump the contract `version` to `2.0.0`.
6. Skill text (`skill/SKILL.md`, `skill/references/**`) is rewritten around the 18 nodes and the anti-box
   rules, with the five shape recipes from section 4. Delete guidance that recommends `stat-card`, `grid`,
   `card` or `status-grid`.

## 6. Work breakdown (disjoint file ownership)

Order: WP0 lands first, as a small contract stub. WP1–WP5 then run in parallel. WP6 runs last.

**WP0: contract and schema** (owner: one agent, about 2 h, blocks the rest)
- Owns: `shared/src/contract.ts`, `shared/src/artifact-schema.ts`, `shared/src/plan-schemas.ts`,
  new `shared/src/editorial-schemas.ts` (props for chapter, columns, callout, details, ledger, checklist,
  figures, steps, map, story, compare, timeline v2, trend, links), `app/src/lib/contract/*`,
  `cli/src/validate.ts`, `cli/assets/contract.json`.
- Delivers: Zod schemas plus manifest entries plus the legacy split. It also delivers stub adapters
  (`return null`) registered in `component-registry.tsx`, so WP1–4 only replace stub bodies. WP0 also owns
  `app/src/components/component-registry.tsx` and `app/src/components/adapters/index.ts`. **No other WP
  edits those two files.** Each WP exports from its own new file, and WP0 pre-wires the imports to those
  file names.
- Acceptance: `pnpm export:contract` succeeds; `visual-artifact contract` lists 18 core plus specialised
  types; every stored artifact still parses (`pnpm verify:artifacts`); a schema test rejects a `map` with 7
  nodes.

**WP1: foundations, tokens, bugs and page shell**
- Owns: `app/src/app/globals.css`, `app/src/app/layout.tsx`, `app/src/components/artifact-primitives.tsx`
  (bare `Figure`), `app/src/lib/artifacts/status.tsx` (tone → signal tokens),
  `app/src/components/visual-artifact-renderer.tsx` (hero, container), new `app/src/components/page-rail.tsx`,
  `app/src/components/scroll-active-provider.tsx`, the `break-all` fixes in `app/src/components/ui/stepper.tsx`,
  `ui/definition-list.tsx`, `ui/card.tsx`, `ui/prose.tsx`, and `data-adapters.tsx` **lines 98/157/219/268/289 only**
  (one-line swaps, done first, before WP2 rewrites that file).
- Acceptance: no `break-all` left in prose paths (`rg break-all app/src` shows only code and path
  spans); the contrast test passes for the signal tokens; the weekly report renders with no `Figure` border.

**WP2: rows and lists**: ledger, checklist, figures, table, callout, details, links
- Owns: new `app/src/components/adapters/editorial/ledger-adapter.tsx`, `checklist-adapter.tsx`,
  `figures-adapter.tsx`, `table-adapter.tsx`, `callout-adapter.tsx`, `details-adapter.tsx`,
  `links-adapter.tsx`. It also owns `app/src/components/adapters/data-adapters.tsx`, rerouting
  `status-grid`, `table`, `data-table` and `comparison-table` legacy renders to the new components, after
  WP1's line swaps.
- Acceptance: DOM tests show the ledger groups in order, no row has a border-left or a pill, and a title
  column of 10ch does not split "stops". Old `status-grid` data renders grouped.

**WP3: diagrams**: map, story, steps, sequence restyle, label placement
- Owns: `app/src/components/adapters/plan/diagram-svg.tsx` (label placement), new
  `app/src/lib/diagram/label-placement.ts` (pure function plus unit tests), new `app/src/lib/diagram/map-layout.ts`,
  new `adapters/editorial/map-adapter.tsx`, `story-adapter.tsx`, `steps-adapter.tsx`,
  `app/src/components/adapters/plan/box-diagram-adapter.tsx` (legacy → map renderer where possible),
  `plan/sequence-diagram-adapter.tsx`, and `plan/state-machine-adapter.tsx` (panel removal only).
- Acceptance: unit test shows that for the weekly report's 9-node box diagram, no label rectangle
  intersects a node rectangle. `story` shows the full diagram under reduced motion. `steps` draws
  connectors and key segments.

**WP4: chapters, prose, compare, timeline, trend, decision**
- Owns: `app/src/components/adapters/layout-adapters.tsx` (`section` → chapter renderer; legacy `card`/`grid`
  rendered bare), new `adapters/editorial/chapter-adapter.tsx`, `columns-adapter.tsx`, `compare-adapter.tsx`,
  `timeline-adapter.tsx`, `trend-adapter.tsx`, `app/src/components/adapters/leaf-adapters.tsx` (prose
  run-in labels, code bare), `app/src/components/adapters/plan/decision-adapter.tsx`,
  `app/src/components/adapters/plan/plan-ui.tsx`, `app/src/components/adapters/plan/summary-adapters.tsx`.
- Acceptance: the chapter registers in the rail context (via the hook WP1 exports; agree the name
  `useChapterRegistry` up front). `compare` hides identical rows. The title is always larger than the body
  in every adapter.

**WP5: skill text and examples**
- Owns: `skill/SKILL.md`, `skill/references/**`, `ai-artifacts/docs/nodes.md`, `ai-artifacts/docs/DESIGN.md`,
  new `ai-artifacts/node-redesign/examples/*.json` (five old/new pairs from section 4 with real data),
  new `ai-artifacts/node-redesign/gallery.md`.
- Can start right after WP0 because it depends only on the contract.
- Acceptance: every example validates with `visual-artifact validate`. The skill names the anti-box rules
  and the five recipes, and never mentions `stat-card`, `grid`, `card` or `status-grid` except as legacy.

**WP6: verify** (after WP1–5)
- Owns: `app/scripts/qa/*`, screenshots under `ai-artifacts/node-redesign/screenshots/`.
- Runs lint, export, verify:artifacts, build and visual QA, then captures before/after screenshots for
  light, dark, 1440 px and 390 px. Hands them to the adversarial reviewer.

## 7. Risks and open questions

- **`story` is the riskiest node.** Sticky plus scroll-linked state inside the annotation and Colab panel
  layout may fight with the panel padding. If it slips, ship `map` and `steps` first. `story` is not
  needed for the weekly report.
- **Static export width measuring.** Label placement needs text widths before paint. Use a char-width
  estimate per font (serif and sans tables) in the pure function, then refine with `getBBox` after mount.
  Both must give the same layout class to avoid jumps. Test it at 390 px.
- **Annotations depend on node paths** (`lib/artifacts/node-paths.ts`). Renaming types or wrapping nodes
  differently may orphan comments on stored artifacts. WP0 must keep the stored `type` strings unchanged
  for old specs.
- **Legacy warnings vs agents with old skill text.** Warn only, as decided above. Do not reject.
- **Open question for Iury:** should the rail and hero chapter index also show on very short artifacts with
  1-2 chapters? Proposed default: hide the rail under 3 chapters.
- **Open question for Iury:** does `done` stay muted, or should he see green for done? The spec says muted,
  so attention goes to risk and waiting.
