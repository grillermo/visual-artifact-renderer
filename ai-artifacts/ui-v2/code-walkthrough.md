# Code walkthrough components for UI v2

Status: design proposal, not built. Branch `ui-v2`, contract `2.0.0` today.

Recommendation: ship three trusted code components in contract `3.0.0`.

- Upgrade `code` to handle snippets, ranged notes and diffs (unified or split, with word emphasis).
- Add a `walkthrough` node: one or more files, ordered steps, and a code pane that follows the reader.
- Re-lay out `execution-trace` at full content width. Its schema does not change.

`diff`, `code-block` and `log` stay as legacy aliases that render through the new `code` view.

## 1. How artifacts use code today

Corpus: 187 artifacts under `~/.agents/skills/visual-artifact/artifacts/*/*/artifact.json`.

| Node | Instances | Artifacts | Notes |
|---|---|---|---|
| `code-block` | 154 | 74 | median 10 lines, p90 21, max 42. 0 use annotations, highlight or diff |
| `code` | 3 | 4 | 1 uses annotations and highlight (the "Database clock" SQL) |
| `diff` | 22 | 14 | all but 1 use `before`/`after`. 9 set `mode: "split"`. Most are 2-16 lines; 6 are 30-65 lines |
| `execution-trace` | 8 | 7 | 2-11 events, 1-8 distinct files |
| `call-stack` | 2 | 2 | 4-5 rows, no excerpts |

Languages in `code-block`: typescript 52, bash 38, text 36, json 9, python 5, tsx 4.
Props: 77 have title only and 72 have title plus caption. The explanation lives in the caption, not beside the line.
Parents: 120 are inside legacy `section`. 21 parents hold two code blocks in a row. One holds eight ("Key code snippets" in `ai-song-import-done`).

### The five recurring shapes

1. **Command recipe.** A bash block with a verb title ("Bootstrap a new machine") and an optional one-line caption. About 25% of blocks. Needs: copy, prompt-free lines, no line numbers.
2. **Explained excerpt.** One 8-25 line TypeScript excerpt titled `path — role` ("cli/src/logger.ts — one output boundary"). The why sits in the caption and must point at a line in prose ("the second branch..."). This is the shape ranged notes should absorb.
3. **Before/after change.** A `diff` with `before`/`after`, titled `path — why`, usually split, 2-16 lines. Three artifacts stack 2-4 of these in a row to tell one change across files.
4. **Structure or output.** `text` blocks with ASCII trees, config files (`~/.ssh/config`) and sample terminal output. Needs: no highlighting noise, optional emphasis on one entry.
5. **Multi-hop path.** A trace of 5-11 calls with `file:line`, across 1-8 files, with values at boundaries. Today this is `execution-trace`, or two to eight `code-block` nodes in sequence with titles naming the file. The sequence version is a walkthrough without the walking.

Finding: agents explain code with captions and adjacent prose because the line-anchored tools are undiscoverable or too fiddly. Ranged notes must be the obvious default in the contract example and the skill, not an advanced option.

## 2. Proposed components

### 2.1 `code` (upgraded)

One node for shapes 1-4. All current props stay valid.

```json
{
  "type": "code",
  "props": {
    "file": "worker/src/routes.ts",
    "title": "R2 compare-and-swap",
    "language": "typescript",
    "startLine": 40,
    "code": "...",
    "highlight": ["44-46"],
    "annotations": [
      { "line": 44, "end": 46, "title": "Read the etag first", "body": "The write is conditional on this value.", "tone": "info" },
      { "line": 51, "text": "onlyIf", "title": "Atomic guard", "tone": "ok" }
    ]
  }
}
```

Diff form, replacing the `diff` node:

```json
{
  "type": "code",
  "props": {
    "file": "cli/src/logger.ts",
    "title": "One output boundary",
    "language": "typescript",
    "before": "console.log(msg)\n...",
    "after": "logger.info(msg)\n...",
    "diffMode": "split",
    "annotations": [{ "line": 3, "side": "new", "title": "Single sink", "tone": "ok" }]
  }
}
```

Prop changes in `CodeBlockPropsSchema` (`shared/src/plan-schemas.ts`):

| Prop | Type | Rule |
|---|---|---|
| `file` | `string?` ≤200 | path shown in the header. `title` becomes the role |
| `code` | `string` | now optional; exactly one of `code` or `before`+`after` |
| `before`, `after` | `string?` | both or neither. Line-diffed with the `diff` npm package |
| `diff` | `boolean?` | unchanged: hand-written `+ `/`- `/`@@` lines |
| `diffMode` | `"unified" \| "split"?` | default `unified`. Split falls back to unified below 720px container width |
| `annotations[].end` | `int?` | inclusive range end, ≥ `line`. Ranges may not overlap |
| `annotations[].side` | `"old" \| "new"?` | diffs only, default `new` |
| `annotations[].text` | `string?` ≤80 | a substring of the start line to emphasise. Must exist on that line |
| `annotations[].tone` | add `idea` | matches `callout` tones in DESIGN.md |
| size cap | | ≤400 lines and ≤24 KB per side. Error tells the agent to split or use `walkthrough` |

Keep `annotations` (max 12). Do not add a parallel `notes` prop.

**At 1440.** The content column is 1120px, so code gets about 1056px.

- Header line above the surface, not a bar: `file` in mono `text-meta` ink, `title` in sans ink-muted, then right-aligned `+12 −3` stats in change colours, language and copy.
- Flat `--code-bg` surface with no border or shadow, and radius `--radius-md`. Mono 13px on a 24px line.
- When the container is at least 900px wide and there are notes, a note rail of 17rem sits to the right of the code (container query, not viewport). Each note aligns to its start line. Collisions push later notes down, and a hairline connects the note to its pin if it moved more than one line.
- Each note shows a filled 18px numbered pin in its tone colour, the title in `text-row-title`, and the body in `text-small` ink-muted. The same pin sits in the code gutter at the range start.
- A range draws a 2px bracket in the gutter from `line` to `end`, plus a 6% tone tint across the rows. The `text` substring gets a 2px underline in the tone colour at `text-underline-offset: 3px`.
- Split diff uses two equal columns with a `--rule` divider and one shared horizontal scroll container. Removed and added rows are paired so each row lines up with its counterpart.

**At 390.** No rail.

- Notes render inline after the range's last line, full container width. They stay `sticky left-0` so horizontal code scroll does not move them (the current behaviour).
- Split falls back to unified. Mono drops to 12.5px on a 22px line. The gutter narrows to 2.25rem.
- The header wraps to two lines: `file` first, then stats and copy.

**Word emphasis.** For each paired `-`/`+` run, `diffWordsWithSpace` returns character ranges. Split Shiki tokens at range boundaries, then wrap changed ranges in a span with a 28% tint of the change colour. Pairing rule: adjacent removal and addition runs of equal length pair by index. Unequal runs pair by highest similarity ≥0.4. Unpaired lines get line tint only.

**Command recipe.** For `language: bash|sh|zsh` without notes, hide line numbers by default and copy without a `$ ` prefix.

### 2.2 `walkthrough` (new, specialised)

This covers shape 5 when the reader should move through source, and the "Key code snippets" sequences. It is a node rather than a `chapter` + `code` recipe because the recipe cannot keep one file in view while the reader moves through steps.

```json
{
  "type": "walkthrough",
  "props": {
    "title": "How a retry gets bounded",
    "files": [
      { "path": "src/retry.ts", "language": "typescript", "src": "src/retry.ts:1-90" },
      { "path": "src/cache.ts", "language": "typescript", "code": "...", "startLine": 1 }
    ],
    "steps": [
      { "lines": "12-18", "title": "Pending work is a plain Map", "body": "Nothing ever evicts settled jobs.", "tone": "risk", "text": "new Map()" },
      { "file": "src/cache.ts", "lines": "4-20", "title": "The LRU wrapper", "body": "Capacity is enforced on set." },
      { "lines": "12", "title": "Swap it in", "tone": "ok" }
    ],
    "caption": "Read top to bottom; the code follows."
  }
}
```

Rules:
- 1-4 files, each with the same code props as `code`: `path`, `language`, `code`, `src`, `startLine`, `before`, `after`, `diff`, and the 400-line cap.
- 2-8 steps. `file` is required only when there is more than one file. `lines` is `"n"` or `"a-b"` and must be in range.
- Steps use the annotation fields: `title` ≤80, `body` ≤400 (markdown inline only), `tone?`, `text?`, `side?`.
- `src` is inlined by `visual-artifact create`, as for `code`.

**At 1440.** A two-column grid inside the 1056px content width: steps take `minmax(18rem, 22rem)`, the code pane takes the rest.

- The left column is the step list. Each step has a numbered pin, title and body, separated by `--rule` hairlines, with roughly 40svh of space between steps so scroll can drive them.
- The right column is a sticky code pane: `top: calc(var(--header-height) + 1rem)`, `max-height: calc(100svh - var(--header-height) - 2rem)`. Its header shows the active `file` and "Step 2 of 5" with previous and next buttons.
- The active step is chosen by IntersectionObserver with a band at 40-55% of the viewport. Reuse the logic in `app/src/components/adapters/editorial/story-adapter.tsx`. Clicking a step also activates it.
- When the step changes:
  - The pane scrolls to centre the range (`behavior: smooth`, 240ms; `instant` under reduced motion).
  - The active range gets a 10% `--brand` tint and the gutter bracket.
  - Lines outside it drop to 55% opacity.
  - Other steps' pins stay visible in the gutter at muted strength, so the whole route is legible.
- A file switch cross-fades the code body (opacity, 160ms) and updates the header path.

**At 390.** No sticky pane, because it would take half the screen. Each step renders inline:

- the pin, title and body
- then a trimmed excerpt of its range ±3 context lines, labelled "src/retry.ts · lines 9-21 of 90", rendered by the same code view with the range highlighted
- after the last step, a `details` "Show full file" for each file

Keyboard: the pane is a focusable region. `ArrowDown`/`ArrowUp` (or `j`/`k`) move steps when it has focus. Previous and next buttons have 44px touch targets.

### 2.3 `execution-trace` (re-laid out, same schema)

See section 3. Call-stack excerpts (`call-stack-adapter.tsx`) render through the new code view and drop their `border-t bg-muted/30 p-3` wrapper.

## 3. Call-stack panel at full content width

The problem today is in `execution-trace-adapter.tsx`:

- The stack is a fixed 19rem rail.
- Rows are `h-20` with three truncated lines.
- The list is capped at 30rem.
- The source pane shares the row with the title and controls, then the inspector stacks below in half-width columns.
- At 1056px the source gets about 750px, and every frame label is cut off.

New layout, at a container width of at least 960px:

```
┌ title · provenance ─────────────────────────────── ◀ 3 / 9 ▶ ┐
├ boundary bar: validation  Parsed JSON → Renderer contract  passed ┤
│ STACK (24rem)                │ SOURCE (1fr)                        │
│ 1  ƒ main         cli.ts:12  │ shared/src/artifact-schema.ts       │
│ 2  │ ƒ create     create:88  │ inside safeParseVisualArtifactSpec  │
│ 3  │ │ ▸ validate schema:1610│ 1605 …                              │
│ 4  │ ⇠ return     create:91  │ 1610 ▸ return Schema.safeParse(v)   │
│ …                            │ (code view, focus line tinted)      │
├──────────────────────────────┴─────────────────────────────────────┤
│ INPUTS               │ OUTPUTS               │ EFFECTS / ERRORS     │
└──────────────────────┴───────────────────────┴──────────────────────┘
```

- **Width.** Use the full 1056px. Do not bleed past the content column, because the page rail sits there at ≥1100px. Width comes from removing chrome, not from breaking out.
- **Stack column, 24rem.**
  - Rows are auto-height, minimum 44px.
  - Line 1 holds the order number (tabular, ink-muted), depth guides (1px `--rule` verticals, 1rem per level), a kind glyph (ƒ call, ⇠ return, ✕ throw, ⇄ boundary, · note) and the symbol in mono 13px ink.
  - `file:line` is right-aligned on the same line when it fits. Otherwise it wraps to line 2 in `text-meta` ink-muted.
  - The label wraps to at most 2 lines, with no truncation.
  - The column height matches the source pane, with internal scroll only past 14 rows.
- **Selection.** The selected row gets a 10% `--brand` tint, a filled brand order pin and `aria-current="step"`, but no side stripe. Throw rows show `--signal-risk` on their glyph. Boundary rows show their outcome as a dot plus mono word.
- **Source column.** The new `code` view with `startLine` from facts:
  - The `focus` line gets a brand tint and an inline `text` underline on `focus.text`.
  - Lines inside `scope` keep full strength. Lines outside drop to 55% opacity.
  - Height is `clamp(20rem, 60svh, 36rem)`.
- **Boundary bar.** It spans both columns above them and shows `from → to` in ink, the kind as a mono word and the outcome as dot plus word.
- **Inspector.** It spans full width below. It has up to three equal columns (inputs, outputs, effects and errors), and empty ones collapse. Type badges become mono text. Long previews wrap.
- **Pager.** At top right, with the same previous and next behaviour. The keyboard keeps `ArrowUp`/`ArrowDown` on the stack.

Below 960px, including 390:

- Header, pager and boundary bar stack in that order.
- The stack becomes a `details` element, "Call stack · 9 frames", closed by default. Its summary row shows the current frame (pin, glyph, symbol, `file:line`). Opening it shows the full tree.
- The source is full width with horizontal scroll and the gutter at 2.25rem.
- The inspector stacks: inputs, outputs, then effects.

Check during build: confirm how the adapter derives depth today. If it does not derive depth, compute it from `call`/`return` order in a pure helper. Do not add a schema field.

## 4. Visual direction

Keep the typography: Geist Sans, Geist Mono and the editorial serif for chapter titles. Code is never set in serif. Colour carries meaning only. Each meaning has exactly one token.

| Meaning | Token | Where |
|---|---|---|
| added | `--change-added` | `+` glyph, row tint 12%, word tint 28%, `+N` stat |
| removed | `--change-removed` | `−` glyph, row tint 12%, word tint 28%, `−N` stat. Never `--signal-risk` |
| changed (paired) | `--change-changed` | only on the split-row divider tick for paired rows |
| focus (active step, highlight, selected frame, trace focus line) | `--brand` | 10% tint, gutter bracket, filled pins |
| note tone `ok` / `risk` / `warn` / `info` / `idea` | `--signal-new` / `--signal-risk` / `--signal-wait` / `--ink` / `--brand` | pin fill, range bracket, `text` underline |
| everything else | `--ink`, `--ink-muted`, `--rule` | |

Bolder than today, where it helps the reader:

- Pins are solid fills with `--background` text, not outline chips.
- Diff glyphs and stats are full-strength colour.
- The active walkthrough range is the brightest thing on the screen, and the rest of the file recedes.

Remove the `rounded-2xl border bg-card shadow-sm` frame, the muted header bar, the tinted note boxes and the 3px coloured left border on note cards (`impeccable` bans side stripes).

Notes are plain text beside or under the code. Tints use `color-mix(in oklch, <token> N%, transparent)` so the same rule works in both themes.

Checks:

- Shiki `github-light` and `github-dark` tokens must reach 4.5:1 on `--code-bg` (`#f1eee7` light, `#1c1b18` dark) and on code-bg mixed with a 12% tint. Check this in a test with a contrast helper over the theme JSON. If a theme fails, swap it (for example to `github-light-high-contrast`) rather than hand-tuning colours.
- Colour is never the only signal. Every coloured mark also has a glyph (`+ − ▸ ✕`), a number or an accessible name.

Motion: transition only `background-color`, `opacity` and `scroll`, at 160-240ms `ease-out`. Under `prefers-reduced-motion` everything is instant. There is no animation on page load.

## 5. Build order

Each step builds and tests green on its own. Do not run dev servers on 9997-9999 during agent work. The QA harness uses 9991/9992.

1. **Pure line model.**
   - New file `app/src/lib/code-lines.ts`. It splits lines, parses unified hunks with old/new numbers, diffs `before`/`after` with `diff` (`diffLines`), pairs runs, computes word ranges with `diffWordsWithSpace`, slices tokens at character ranges, lays out notes with collisions, and trims excerpts with context.
   - Add the `diff` package to `app/package.json` (BSD-3-Clause) and record it in `NOTICE`.
   - Replace the O(n×m) LCS in `app/src/lib/diff-parser.ts`, keeping it as a re-export until step 4.
   - Tests in `app/src/lib/code-lines.test.ts`: hunk numbering, equal and unequal pairing, the similarity fallback, word ranges across token boundaries, note collisions, excerpt trimming at file edges, CRLF input, trailing newline.
2. **Schema and contract.**
   - In `shared/src/plan-schemas.ts`:
     - Add the new `code` props and refinements: exactly one of `code` or the `before`+`after` pair, `end` ≥ `line`, no overlap, `text` exists on the line, `side` only on diffs, and the size cap.
     - Add `WalkthroughPropsSchema`: files 1-4, steps 2-8, `file` required when there are several files, `lines` in range.
   - Register `walkthrough` in `shared/src/artifact-schema.ts` and in `SPECIALISED_NODE_TYPES` and the manifest in `shared/src/contract.ts`. Bump `CONTRACT_VERSION` to `3.0.0`.
   - Update the `code` example to show `annotations` with a range. Point the `diff` legacy hint to `code` with `before`/`after`.
   - Update `app/src/lib/contract/artifact-manifest.ts`, then run `pnpm export:contract`.
   - Tests in `app/src/lib/contract/plan-nodes.test.ts`: valid and invalid ranges, overlap, missing `text`, `side` without diff, `before` without `after`, the cap message, walkthrough file and step rules. `pnpm verify:artifacts` must still parse every stored artifact.
3. **CLI `src` inlining.** In `cli/src/commands/create.ts`, inline `walkthrough.props.files[].src` the same way as for `code`. Add a CLI test fixture.
4. **Code view.**
   - Replace `app/src/components/ui/code-block-structured.tsx` with `app/src/components/ui/code/`: `code-view.tsx` (header, surface, scroll), `code-rows.tsx` (gutter, glyphs, tokens, word spans), `note-rail.tsx`, `split-rows.tsx` and `use-tokens.ts` (Shiki).
   - Route `code`, `code-block`, `log` and legacy `diff` in `app/src/components/adapters/leaf-adapters.tsx` through `CodeView`. `diff` maps `content` to `diff: true` and `mode` to `diffMode`.
   - Delete `app/src/components/ui/diff.tsx` and the plain `code-block.tsx` path once no import remains.
   - Tests in new `app/src/components/ui/code/code-view.dom.test.tsx`: pin numbering in line order, range bracket rows, `text` underline, split falling back to unified in a narrow container, word spans only on paired rows, copy text excluding removed lines, accessible names for `+`/`−`.
5. **Walkthrough adapter.**
   - New `app/src/components/adapters/walkthrough-adapter.tsx`, plus `use-active-step.ts` extracted from the story adapter's observer.
   - Register it in `app/src/components/component-registry.tsx`.
   - Tests in `walkthrough-adapter.dom.test.tsx`: step order, click activates a step, the active range has `data-active`, a file switch updates the header, narrow width renders per-step excerpts and no sticky pane, arrow keys move steps, reduced motion uses `instant`.
6. **Execution-trace layout.**
   - Restructure `app/src/components/adapters/execution-trace-adapter.tsx` per section 3.
   - Replace its private `useHighlightedLines` with `CodeView`, and move depth derivation into a pure helper.
   - Remove the `call-stack` excerpt wrapper.
   - Tests in `app/src/components/adapters/execution-trace-adapter.test.tsx`: no truncation classes on rows, `aria-current` on the selected row, collapsed `details` under the breakpoint, empty inspector columns removed, depth helper unit cases.
7. **Docs and skill.**
   - Update `ai-artifacts/docs/nodes.md` (code, walkthrough, trace) and `ai-artifacts/docs/DESIGN.md` (the section 4 table replaces the callout-tone note for code).
   - In `skill/SKILL.md`, make "explained excerpt = `code` + annotations" the default. Add "sequence of excerpts across a flow = `walkthrough`".
8. **Visual QA.**
   - Add a fixture artifact `node-redesign/code-walkthrough-fixture`: one recipe, one annotated excerpt, a split diff with word changes, a unified diff with ranged notes, a 3-step walkthrough over 2 files, a 9-frame trace, a long-line case (>140 columns) and a dense-note case (6 notes in 10 lines).
   - Capture it at 1440 and 390, in light and dark, with `ai-artifacts/ui-v2/qa/capture.mjs --only node-redesign/code-walkthrough-fixture`, plus the 14 `diff` artifacts listed in section 1.
   - Then run `pnpm lint && pnpm test && pnpm export:contract && pnpm verify:artifacts && pnpm build`.

Dependencies: step 1 comes first. Steps 2 and 3 come before 4-6. Steps 4, 5 and 6 can run in parallel once `CodeView` exports a stable API. Steps 7 and 8 come last.

## Risks and open questions

- **Rail alignment with horizontal scroll.** The rail lives outside the scroll container and aligns by line index, so wrapped notes can drift on very dense ranges. The collision layout plus a connector covers it. Verify with the dense-note fixture.
- **Split diffs with long lines** get cramped at 1056px. If the QA shots look bad, cap split at files with p90 line length ≤ 70 columns and fall back to unified otherwise.
- **Sticky pane and the page header.** Confirm `--header-height` is defined on artifact pages, not only on the index.
- **Tone colour overlap.** `--signal-new` and `--change-added` are both green. A note's `ok` tone next to an added row may read as one meaning. Option: notes use only `info`/`risk`/`idea` in diffs. Decision for Iury.
- **The 3.0.0 bump** is a renderer-visible major with no breaking schema change. Old specs parse and render, though they look different. Confirm that this matches what "new major" means to Iury.
