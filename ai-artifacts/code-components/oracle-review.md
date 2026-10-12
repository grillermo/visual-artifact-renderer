# Oracle review: code components research

Reviewed: `ai-artifacts/code-components/research.md`. Checked against the repository at `node-redesign` (with uncommitted changes from other workers), `ai-artifacts/node-redesign/design-spec.md`, and the Plannotator v0.28.10 source in `/tmp/plannotator-src` (commit `8c19f59`). I also checked the installed `plannotator-pi/0.28.10` `node_modules`.

## Verdict

| # | Proposed node | Verdict | One-line reason |
|---|---|---|---|
| 1 | Upgrade `code` (split diff, range notes, keep legacy `diff`) | **Change** | Right direction. Extend the existing `annotations` prop instead of adding a parallel `notes` prop, define the diff line model and note sides, and do not use `--signal-risk` for deletions. |
| 2 | `code-walkthrough` (new node) | **Change: defer the node** | Iury must approve a contract addition, because the redesign is shrinking the contract to 18 nodes. First ship a "notes beside code" layout on `code` plus a `chapter` + `code` recipe. If a node is still wanted, make it a container of `code` children, not a copy of `code` props. |
| 3 | Restyle `call-stack` / `execution-trace` | **Drop as a separate proposal** | The node redesign already does this (`PlanFrame` is already bare in the working tree). The extra execution-trace restyle goes beyond the spec's "remove the outer Figure only" scope. Keep one small follow-up: call-stack excerpts inherit the new `code` look for free. |
| — | `@pierre/diffs` | **Drop for v1** (the research agrees) | It renders in Shadow DOM, which breaks our node-anchored annotation `textSnippet` selection and our token theming. Its worker is Vite-inlined upstream, which needs a webpack/static-export rework. It is about 9.9 MB unpacked, and the gain only matters for large files we don't render. |

## Inherited decisions (baseline)

- **The contract is the handshake.** Agents emit JSON. Zod in `shared/` validates it at CLI create time and again in the renderer. `pnpm export:contract` (`app/package.json:14`) publishes the manifest. New props must be terse, capped, and refined against the content.
- **Design spec §1:** `diff` merges into `code` (`diff: true`), and `code-block` is renamed `code` with an alias. `code` "keeps all props". `execution-trace` is "out of scope for restyle beyond removing the outer Figure". `call-stack`: "remove the panel". The agent contract goes from 48 node types to **18**, with specialised nodes listed separately.
- **Anti-box rules:** one surface at most (`code` is one of three allowed surfaces), hairlines and space instead of borders, status as a dot or icon plus a word, at most three semantic hues (`--signal-new`, `--signal-risk`, `--signal-wait`) each paired with a non-colour cue, and a radius of 8 px only on `code`.
- **Static export:** `output: 'export'` in production (`app/next.config.ts`). Artifact JSON is fetched at view time, so highlighting happens in the browser. No CDN or runtime server.
- **Persisted comments are node-anchored:** `AnnotationAnchorSchema` holds `nodeId`, `nodePath`, `nodeType`, `textSnippet`, and x/y. There is no line anchor.

## Verified claims (correct)

- Plannotator v0.28.10 is `MIT OR Apache-2.0` (`package.json:7`). It pins `@pierre/diffs` 1.3.6 (Apache-2.0) and `diff` ^8.0.4 (BSD-3-Clause). Shiki 4.5.0 is MIT. `@pierre/diffs` is 9.9 MB on disk.
- `CodeAnnotation` has `filePath`, `lineStart`, `lineEnd`, and `side: 'old' | 'new'` (`packages/ui/types.ts:299-313`). `diffStyle` defaults to `split` (`settings.ts:380-381`). The worker pool uses `shiki-js` (`workerPool.tsx`).
- The legacy `diff` schema has `mode: unified|split`, `showLineNumbers`, `indicators`, and `highlightInline` (`shared/src/artifact-schema.ts:1366-1379`). It is already marked legacy with `replacedBy: "code"` (`contract.ts:404-410`).
- `ui/diff.tsx` wraps output in `Card` and uses hand-rolled LCS for lines (`computeDiff`) and characters (`inlineDiffSegments`). Both are O(n×m).
- `CodeBlockPropsSchema` has at most 12 `annotations`, one per line, refined against `startLine..last` (`plan-schemas.ts:83-138`). `code-highlighting.ts` lazily imports Shiki with 20 preloaded languages and the github-light/dark themes.
- Token names exist in light and dark (`globals.css:155-164`, `209-217`).

## Factual errors and imprecisions in research.md

1. **"Split/unified already exists" applies to the legacy `diff` node only.** `code` with `diff: true` renders through `StructuredCodeBlock`, which is unified only and marks lines without numbering. It does not parse `@@ -a,b +c,d @@` and has no old/new line numbers (`code-block-structured.tsx:66-79`). So adding `diffMode: "split"` to `code` is new work, not an upgrade of existing behaviour. The plan should say whether `code` reuses `Diff`'s split layout (which sits on a Card and has the LCS hot path) or gets its own.
2. **The diff-line format is looser than stated.** The schema regex is `/^[+\- ]/` (`plan-schemas.ts:131`), so `+x` without a space passes. The research repeats the manifest's `"+ ", "- ", "  "` wording. If split mode pairs runs of deletions and additions, it needs a precise prefix rule.
3. **"Reuse the code renderer" for `execution-trace` is a refactor, not a restyle.** The trace tokenizes on its own (`execution-trace-adapter.tsx:407`, `highlighter.codeToTokens`). Only `call-stack` already uses `StructuredCodeBlock`.
4. **The proposed diff colours conflict with the existing tokens.** Diff colours today use `--change-added` / `--change-removed` (olive/rust, with a dark variant at `globals.css:224`), not the signal tokens. The research maps additions to `--signal-new` and deletions to `--signal-risk`. That makes "removed" read as "can break", and it spends two of the three per-page hues on every diff.
5. **"Remove the outer `Figure`/`PlanFrame` border where present" is stale.** `PlanFrame` is already a bare `flex flex-col gap-3` figure in the current working tree (`plan-ui.tsx:96-101`, modified by the redesign). `execution-trace` still uses `Figure` with nested bordered panels (`execution-trace-adapter.tsx:93, 161, 208, 316`), but the spec limits that change to the outer Figure.
6. Minor: research §C1 says to remove `diff` from the agent-facing manifest "as the design spec directs". The contract already does this through `legacy`. No work is needed.

## What the research missed

- **Two ways to say one thing.** Adding `notes` next to `annotations` gives agents two overlapping props on the same node, which is contract bloat that the redesign is trying to remove. Better: keep `annotations` and add an optional `endLine` (and `side` for diffs). The superRefine changes from "one annotation per line" to "ranges must not overlap" plus `endLine >= line`. Old specs stay valid without a normalisation shim.
- **Notes on diffs need a side.** Plannotator anchors to `old|new` because a line number is ambiguous in a diff. The research's `notes` have no `side`, and `code`'s diff mode has no old/new numbering. Decide this: in diff mode, `line` refers to new-side numbers, derived from `@@` headers or from `startLine`, with an optional `side: "old"`.
- **The tone vocabulary doesn't match.** `CodeAnnotationToneSchema` is `info|warn|risk|ok` (four tones). The spec's grammar is `new|risk|wait` plus ink, shown as a dot or icon plus a word. The renderer must map tones to signal tokens with a word label, and should keep the four-value enum for compatibility. The current notes are bordered, tinted callouts with numbered pills (`code-block-structured.tsx:38-45, 214-227`). Rule 3 forbids that pattern, so a restyle is required.
- **`src` refs.** `code` already supports `src: "path:12-30"`, which the CLI inlines at create time (`cli/src/commands/create.ts:114, 350`). The walkthrough sketch re-declares `file`, `language`, `startLine`, and `code` and loses this source-backed path. Any walkthrough should contain `code` nodes so it inherits `src`, highlighting, and caps.
- **No size cap on `code` today.** `code: z.string().min(1)` has no max. The research proposes a cap, which is good. Make the cap explicit, for example 16 KB or 400 lines, with an error that tells the agent to split. Diff mode, which feeds an O(n×m) LCS, needs it most.
- **Replace the LCS with jsdiff instead of hand-rolling it.** The `diff` package (BSD-3-Clause, Myers O(ND)) is the dependency Plannotator itself uses. It is small and tree-shakeable (`diffLines`, `diffWordsWithSpace`), and it gives word-level highlights, which are the visible quality jump in Plannotator's `word-alt` mode. Record it in `NOTICE` (the repository has one, and the project is MIT).
- **Shadow DOM vs annotations** is the decisive reason to drop Pierre. Our comment system anchors with `textSnippet` from DOM selection, and Pierre renders inside a shadow root. The research cites only bundle size and worker cost.
- **Mobile behaviour of split mode.** Split diffs must fall back to unified below a breakpoint, and margin notes must stack under their range. The research specifies stacking only for the walkthrough.
- **Shiki theme vs `--code-bg`.** github-light and github-dark token colours on `#f1eee7` / `#1c1b18` have not been contrast-checked. Plannotator derives its diff theme from the active palette (`usePierreTheme.ts`). At minimum, verify AA contrast for comments and punctuation on both backgrounds.
- **Other Plannotator ideas worth borrowing cheaply:**
  - a per-file header line `src/retry.ts  +3 −1` in mono, which replaces the bordered badges in `Diff`;
  - collapsed unchanged context ("12 unchanged lines") as a hairline row;
  - `SuggestionDiff`: render "suggested change" as `code` with `diff: true` and a caption, with no new node;
  - `CallFlowTreeView`: call-flow nodes carry `line..endLine` ranges and select code. `call-stack` rows already have `at` and `excerpt`, so this is a possible later enhancement, not part of v1.
- **Docs and skill surface.** Contract changes must also update `skill/SKILL.md` and its references, `ai-artifacts/docs/nodes.md`, and `app/scripts/verify/verify-artifacts.ts` fixtures, then run `pnpm export:contract`. The research lists only schemas, adapters, and tests.
- **Concurrency.** `code-block.tsx`, `leaf-adapters.tsx`, `component-registry.tsx`, `globals.css`, and `artifact-schema.ts` are being modified by other workers right now (`git status`). Any implementation must be sequenced after the redesign's `code` work package lands, not only the Pierre spike.

## Concrete changes per node

### 1. `code` (change)

- Schema (`shared/src/plan-schemas.ts`):
  - `annotations[]` gains `endLine?: int` and `side?: "old" | "new"` (side is valid only when `diff: true`).
  - Raise the cap modestly, for example to 16. Refine against bounds and non-overlap.
  - Add `diffMode?: "unified" | "split"` (valid only with `diff: true`; the default is unified).
  - Add `notesLayout?: "inline" | "margin"`, or make margin the automatic layout on wide screens. Margin notes are the "notes beside the code" Iury asked for.
  - Add `file?: ShortLabel(240)`, rendered as the mono header line.
  - Add a `code` length cap.
  - Do **not** add a separate `notes` prop.
- Diff model: parse `@@ -a,b +c,d @@` for old/new numbering, falling back to `startLine` for both sides. Pair adjacent `-`/`+` runs for split rows and word-level highlights.
- Renderer: one flat `--code-bg` surface, radius 8 px, no border or shadow. Title, file, and stats sit above the surface in mono caps. A `--rule` hairline divides the split columns. Changed lines get a `+` or `−` glyph plus a background tint from `--change-added` / `--change-removed`, not the signal tokens. Notes:
  - in the margin rail, a 2 px left rule in the tone's signal colour, a word label (mono caps), a serif or sans title, and a muted body;
  - a range bracket in the gutter spanning `line..endLine`, with the marker at the range end as Plannotator does;
  - no pills, cards, or tinted note boxes.
- Legacy `diff` node: keep the parser. Re-point the adapter to the new `code` diff renderer by converting before/after through jsdiff into prefixed lines, so the Card-based `ui/diff.tsx` can eventually be deleted.
- Tests:
  - schema tests for ranges, sides, overlap, and caps;
  - DOM tests for split and unified layouts and margin and inline notes;
  - an offline static-export smoke test with Shiki chunks served from `out/`;
  - a dark-mode screenshot check;
  - a check that legacy `diff` and `code-block` fixtures still render.

### 2. `code-walkthrough` (change: defer)

- Step 1, no contract change: document a recipe in the skill. A code walkthrough is a sequence of `chapter` nodes, each with kicker = file, deck = why, one `code` child (preferably with `src`) using margin annotations, and a takeaway. This reuses Plannotator's concept-first order without a new node.
- Step 2, only if Iury approves an extra node after seeing step 1: `code-walkthrough` as a **container**:
  - props: `{ title ≤100, intent ≤240 }`;
  - children: 1–6 `code` nodes, each with optional `overview ≤500` carried in the code `caption`, or a small `section` wrapper;
  - it validates through the existing `code` schema, so there are no duplicated props;
  - on wide screens it shows overview prose on the left and `code` on the right.
- Do not port checkboxes, file chips, or "Everything else" (a static artifact has no PR file set to reconcile).

### 3. `call-stack` / `execution-trace` (drop as a separate item)

- Leave both to the node-redesign work packages.
- `call-stack` excerpts restyle automatically once `StructuredCodeBlock` adopts the new grammar. Also remove the `border-t bg-muted/30 p-3` excerpt panel (`call-stack-adapter.tsx:112`) so the code surface is not inside another surface.
- `execution-trace`: outer Figure only, per the spec. A deeper restyle or a switch to the shared code renderer needs its own approved change.

## Risks

- Split diffs derived from prefixed lines can mis-pair when an agent hand-writes hunks. Fall back to unified when pairing is ambiguous, and never fail validation over it.
- The margin-rail layout combined with horizontal code scroll and 12–16 notes can collide vertically. The layout must stack notes and push the next one down, as Plannotator's gutter annotations do.
- Adding props to `code` while the redesign says it "keeps all props" is a small spec revision. Record it in design-spec §2.17 or in an ADR.
- Bundle: jsdiff is small, but measure it. Shiki's full `import("shiki")` already emits many grammar chunks, so confirm none are fetched from outside `out/`.

## Need from main agent

1. Iury's decision: is a new `code-walkthrough` node acceptable against the 18-node contract, or is the `chapter` + `code` recipe enough? I recommend the recipe first.
2. Confirm the diff colour tokens: `--change-added` / `--change-removed` (recommended) versus the signal hues.
3. Confirm the extend-`annotations` approach (`endLine`, `side`) instead of a new `notes` prop.
4. Sequencing: implement only after the redesign's `code` and leaf-adapter work package merges.

## Suggested execution prompt

None yet. Hand off to a worker only after items 1–4 above are settled and the redesign's `code` work package has landed.
