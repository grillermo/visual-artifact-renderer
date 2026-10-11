# Code components research

## Summary

Visualizer should borrow Plannotator’s information design and diff interactions, not its whole review application. Our renderer already has unified/split diffs and Shiki; the missing pieces are syntax-highlighted diff rows, line-range margin notes, lighter editorial styling, and an ordered code walkthrough. Upgrade `code`, keep the old `diff` node as a compatibility adapter, add `code-walkthrough`, and restyle existing `call-stack`/`execution-trace`; defer `@pierre/diffs` until a built-bundle and static-worker spike proves its cost worthwhile.

## A. Plannotator source findings

1. **Copy and version.** The local `plannotator-pi/0.28.10` install is an npm-shipped package, not the application source. I read the real source from a shallow clone of `backnotprop/plannotator` tag `v0.28.10` (commit `8c19f59`), matching the local pinned extension. The repo identifies version and license in `package.json:2-15`; the local lock pins `@plannotator/pi-extension@0.28.10`.

2. **Diff modes and parsing.** Its single-file viewer sends parsed patch metadata from `getSingularPatch`/`processFile` to Pierre’s React `FileDiff`. It offers `split` and `unified`, line numbers, hunk controls, and `lineDiffType: word-alt | word | char | none`; the default is split with `word-alt` highlights. Split mode uses two columns only when a patch has both additions and deletions, and its draggable divider persists the ratio. Sources: `packages/review-editor/components/DiffViewer.tsx:44-55,91-124,375-390`; `packages/ui/config/settings.ts:380-393,425-438`; `DiffViewer.tsx:322-366,884-900`.

3. **Code and file view.** The all-files screen uses one Pierre `CodeView` for changed files, with file-level items and virtualized line rendering; it lazy-loads full file context only when a file enters the rendered window. A separate read-only code-file popout uses Pierre’s `File` component. Sources: `packages/review-editor/components/AllFilesCodeView.tsx:63-119`; `packages/ui/components/CodeFilePopout.tsx:1-18,77-98`.

4. **Line comments and threads.** A code annotation records `filePath`, `lineStart`, `lineEnd`, and old/new side. The viewer maps it to a gutter annotation at the range’s ending line, while preserving the full range for selection/highlighting. Users select lines or invoke the gutter utility; comments can be edited and deleted in place. The broader annotation model supports replies via `inReplyTo`. Sources: `packages/ui/types.ts:299-313,100`; `packages/review-editor/utils/annotationScope.ts:41-53`; `DiffViewer.tsx:608-617,678-728,650-676`.

5. **Guided reviews.** A guide has a title, intent, ordered concept sections, overview prose, and file references with optional per-file summaries. The viewer resolves those references to files, renders chapters in author order, tracks checked/reviewed sections, and shows unplaced files in an “Everything else” section. Each chapter can focus and reveal its files. Sources: `packages/core/guide.ts:20-52`; `packages/guide-viewer/GuideView.tsx:35-55,123-132,181-212`; `packages/guide-viewer/GuideSectionCard.tsx:162-218`. Borrow the narrative order and file-to-section linking, not its bordered cards.

6. **Highlighting, virtualization, and theme integration.** Pierre uses Shiki. Plannotator initializes a small worker pool with `shiki-js` (the pure-JS engine, avoiding a WASM asset) and preloads common grammars; the guide viewport also caps mounted code views. The surrounding React UI uses Tailwind utility classes; Pierre’s renderer uses a Shadow DOM, so Plannotator reads its active theme colors and injects custom CSS through `unsafeCSS`, including dark/light backgrounds and split-column fixes. Sources: `packages/review-editor/workerPool.tsx:4-35`; `packages/guide-viewer/GuideViewportManager.tsx:11-23,60-66`; `packages/review-editor/hooks/usePierreTheme.ts:201-230,234-276`.

7. **Libraries, license, and weight.** Plannotator `0.28.10` is `MIT OR Apache-2.0` (`package.json:2-15`). The diff renderer is `@pierre/diffs@1.3.6` (Apache-2.0); its `diff@9` dependency is BSD-3-Clause, Shiki is MIT, and `@pierre/theme`/`@pierre/theming` are Apache-2.0. Plannotator also uses `diff@8.0.4` directly (BSD-3-Clause). Sources: local `node_modules/@pierre/diffs/package.json:2-4,66-73`, `node_modules/@pierre/theme/package.json:2-19`, `node_modules/@pierre/theming/package.json:2-4`, `node_modules/@pierre/diffs/node_modules/diff/package.json:1-24`, `node_modules/diff/package.json:2-3,23`, `node_modules/shiki/package.json:2-7`; upstream `package.json:44-52`. Installed `@pierre/diffs` occupies about 9.9 MB unpacked (about 9 MB in `dist`) and Shiki about 3.9 MB unpacked; these are package-directory sizes, not measured browser transfer sizes. The client bundle size remains unknown until an app build.

## B. Visualizer facts and constraints

8. **The contract already points toward one code node.** The redesign explicitly merges `diff` into `code` (`diff: true`) and renames `code-block` to `code`; it permits one code surface and forbids nested full borders. It calls for hairlines, space, and tokens such as `--paper`, `--ink`, and `--rule`. Sources: `ai-artifacts/node-redesign/design-spec.md:68-75,85-101`; `shared/src/contract.ts:404-410,921-926`.

9. **Existing diff behavior is useful but visually dated.** The legacy `diff` Zod schema already accepts before/after or unified content, split/unified mode, line numbers, indicators, and inline highlighting. `app/src/components/ui/diff.tsx` renders both layouts, but wraps them in a `Card` and uses bordered badges. Its hand-written line and character LCS algorithms are O(n×m), so large snippets can consume excessive CPU and memory. Sources: `shared/src/artifact-schema.ts:1366-1379`; `app/src/components/ui/diff.tsx:41-61,133-150,547-660`; the legacy manifest marks `diff` as replaced by `code` at `shared/src/contract.ts:404-410`.

10. **Current `code` nodes already have Shiki and static notes.** `CodeBlockPropsSchema` permits line numbers, source start line, highlighted line/range, and up to 12 one-per-line annotations. The structured renderer tokenizes with `codeToTokens`; simple code uses a separate Shiki-backed component. `code-highlighting.ts` lazily imports Shiki once and preloads 20 common languages with GitHub light/dark themes. Current structured notes are rendered as callouts inside a bordered code card, so keep the behavior but change the visual grammar. Sources: `shared/src/plan-schemas.ts:83-138`; `app/src/components/ui/code-block-structured.tsx:18-32,73-107,132-159,207-225`; `app/src/lib/code-highlighting.ts:6-43`; `app/src/components/adapters/leaf-adapters.tsx:381-385`.

11. **Existing code-oriented nodes overlap but serve distinct jobs.** `call-stack` supports up to 60 terse/object rows, source locations, and bounded inline excerpts; clicking a row selects its excerpt. `execution-trace` has up to 100 ordered events, source spans, hashes, focus facts, and verified excerpts. The CLI re-extracts trace facts at create time. Keep the trace for source-verified execution narratives; use the walkthrough for author-curated explanation, and the call stack for a compact call path. Sources: `shared/src/plan-schemas.ts:154-215`; `shared/src/artifact-schema.ts:1090-1145,1170-1195`; `shared/src/contract.ts:620-632,698-703`; `app/src/components/adapters/plan/call-stack-adapter.tsx:29-37,48-119`; `app/src/components/adapters/execution-trace-adapter.tsx:75-110`.

12. **Persisted comments are node-anchored, not line-anchored.** The shared annotation anchor has `nodeId`, `nodePath`, `nodeType`, optional text snippet, and normalized x/y coordinates; it has no file/line range. Do not present Plannotator’s editable, threaded comments as if the artifact renderer already supports them. Use agent-authored, immutable code notes first. True persistent inline review comments would require a shared annotation/API change. Source: `shared/src/annotations.ts:19-30`; `ai-artifacts/ARCHITECTURE.md:64-78,130-143`.

13. **Static export and theme tokens favor a small client adapter.** Production uses Next `output: 'export'`; the static renderer fetches artifact JSON later from the local CLI server, so code content is unknown at build time and must be highlighted in the browser. The existing client-side Shiki import already loads from same-origin static chunks. Light/dark palettes define `--paper`, `--ink`, `--ink-muted`, `--rule`, `--signal-new`, `--signal-risk`, `--signal-wait`, and `--code-bg`. Sources: `app/next.config.ts:5-19`; `ai-artifacts/ARCHITECTURE.md:118-127,146-160`; `app/src/app/globals.css:92-100,153-164,191-217`.

## C. Proposal

### 1. Upgrade `code`: snippets, annotations, and diffs

**Purpose.** Make `code` the single contract surface for readable snippets and code diffs. Keep `diff: true`; add `diffMode: "unified" | "split"` and `notes` with inclusive source line ranges. Keep old `annotations: { line, ... }[]` as a compatibility input and normalize each item to a one-line note. Keep the old `diff` node parser/adapter for existing artifacts, but remove it from the agent-facing manifest as the design spec directs.

**Example.**

```json
{
  "type": "code",
  "props": {
    "title": "Bound retry memory",
    "language": "typescript",
    "code": "@@ -12,1 +12,1 @@\n- const pending = new Map();\n+ const pending = new LruCache({ max: 250 });",
    "diff": true,
    "diffMode": "split",
    "caption": "Evict completed entries instead of retaining every retry."
  }
}
```

For a normal excerpt, `notes: [{ startLine: 12, endLine: 14, title: "Bounded lifetime", body: "Old entries can no longer accumulate without limit.", tone: "risk" }]` anchors explanatory prose to source lines.

**Zod sketch.**

```ts
const CodeNoteSchema = z.object({
  startLine: z.number().int().min(1), endLine: z.number().int().min(1),
  title: ShortLabel(80), body: z.string().max(280).optional(),
  tone: CodeAnnotationToneSchema.optional(),
}).strict()
// Extend CodeBlockPropsSchema with diffMode and notes; refine note ranges,
// note count, and diff line ranges against the supplied source.
```

Validate `endLine >= startLine`, source bounds, and a combined notes cap. Add a modest line/byte cap for rendered diffs, or replace the current O(n×m) LCS before accepting large before/after inputs.

**Port, don’t import wholesale.** Borrow Pierre’s paired side-by-side layout, line-number gutters, distinct line/word change marks, and the principle of an annotation marker at the end of a range. Reuse our current `Diff` parser/layout and existing Shiki tokenization; replace the LCS hot path with a bounded algorithm or a small diff dependency. Do not add `@pierre/diffs` for v1: the current inputs are short explainers, and Pierre adds Shadow DOM theme overrides, worker packaging, and an unmeasured client cost. Prototype it only if real artifacts need large-file virtualization.

**Files.** Change `shared/src/plan-schemas.ts`, `shared/src/artifact-schema.ts`, and `shared/src/contract.ts`; restyle/extend `app/src/components/ui/code-block-structured.tsx` and `app/src/components/ui/diff.tsx`; wire the new props through `app/src/components/adapters/leaf-adapters.tsx`. Keep the legacy adapter path in `app/src/components/component-registry.tsx`; export the contract and add schema, parser, DOM, and static-preview tests.

**Weight, export, theme, and visual rules.** Reuse Shiki 4.5.0 rather than ship another highlighter. Its current client import is dynamic and its common grammars are bundled locally; no CDN, runtime server, or WASM URL should be introduced. Verify that the built `out/` contains every lazy chunk. Use `--code-bg` for the one allowed code surface, `--ink` for text, `--rule` for the split divider, and `--signal-new`/`--signal-risk` plus `+`/`−` marks for changes. Keep the title above the surface, use a hairline rather than a surrounding card, and render note text in a margin rail or directly below its anchored range—not in nested note cards. Existing `diff` aliases this node; existing `call-stack` excerpts continue to use it.

### 2. Add `code-walkthrough`: ordered explanatory sections

**Purpose.** A compact, self-contained guided review: title and intent, then two to six concept-first sections. Each section names the file, explains why the code matters, and shows a bounded excerpt with range notes. This brings Plannotator’s section ordering into a static artifact without pretending to ship its PR state or comment threads.

**Example.**

```json
{
  "type": "code-walkthrough",
  "props": {
    "title": "How retries stay bounded",
    "intent": "The retry path now releases settled work and limits the cache.",
    "sections": [{
      "title": "Cap pending work",
      "file": "src/retry.ts",
      "overview": "The cache bounds retained retry state even when jobs fail repeatedly.",
      "language": "typescript",
      "startLine": 12,
      "code": "const pending = new LruCache({ max: 250 });\n\nfunction schedule(id: string) {\n  pending.set(id, Date.now());\n}",
      "notes": [{ "startLine": 12, "endLine": 12, "title": "The cap", "body": "Old entries are evicted." }]
    }]
  }
}
```

**Zod sketch.**

```ts
const WalkthroughSectionSchema = z.object({
  title: ShortLabel(80), file: ShortLabel(240), overview: z.string().min(1).max(500),
  language: ShortLabel(30), startLine: z.number().int().min(1),
  code: z.string().min(1).max(16_000), notes: z.array(CodeNoteSchema).max(6).optional(),
}).strict()
const CodeWalkthroughPropsSchema = z.object({
  title: ShortLabel(100), intent: z.string().min(1).max(240),
  sections: z.array(WalkthroughSectionSchema).min(1).max(6),
}).strict()
```

Refine note ranges against excerpt line count and cap total excerpt bytes. These excerpts are narrative snapshots, not source-verified facts; direct agents to `execution-trace` when code identity must be verified.

**Port/adapt and files.** Borrow Plannotator’s concept-first order, overview, file references, and “everything else” principle. Adapt it to the `chapter` typography and `code` component; do not port the guide’s review checkboxes, file chips, or bordered section/file cards. Add the schema to `shared/src/editorial-schemas.ts`, node union and child/type handling to `shared/src/artifact-schema.ts`, and a concise example to `shared/src/contract.ts`. Add `app/src/components/adapters/editorial/code-walkthrough-adapter.tsx`, export it from `app/src/components/adapters/index.ts`, register it in `component-registry.tsx`, and add schema/DOM tests.

**Weight, export, theme, and visual rules.** No library beyond existing Shiki. Static artifact JSON already carries the bounded excerpts; the browser highlights them after fetch. Reuse `--paper`, `--ink`, `--ink-muted`, `--rule`, and the change signal tokens. On wide screens, place prose and a code surface side by side; on mobile, stack them. Use one code surface at most per section, open space between sections, mono file metadata, and a hairline between note rail and code. Notes use a colored rule plus a word/icon, never a bordered card. This complements `chapter` and `code`; it should not duplicate the source-verification guarantees of `execution-trace`.

### 3. Restyle existing `call-stack` and `execution-trace`

**Purpose and example.** Keep both established data models; remove their generic framed-panel treatment and align their code excerpts with the new `code` visual. Example uses the current call-stack format:

```json
{
  "type": "call-stack",
  "props": {
    "title": "Request path",
    "rows": [
      { "call": "<List />", "depth": 0, "kind": "ui", "at": "app/list.tsx:10" },
      { "call": "GET /items", "depth": 1, "kind": "net", "at": "app/api.ts:28",
        "excerpt": { "code": "return fetch(url);", "language": "typescript", "startLine": 28 } }
    ]
  }
}
```

**Zod and implementation.** No schema expansion: retain `CallStackPropsSchema` and the existing `ExecutionTracePropsSchema`, including row/event/source caps and source-fact verification. Restyle `app/src/components/adapters/plan/call-stack-adapter.tsx`, `app/src/components/adapters/execution-trace-adapter.tsx`, and their tests; leave manifest guidance intact except for any visual terminology. Reuse the code renderer and Shiki. There is no new dependency or static-worker concern. Remove the outer `Figure`/`PlanFrame` border where present, use hairlines and `--ink`/`--rule`, and make status/change semantics dot-or-mark plus text. These remain complementary: the stack is a call-path outline; the trace shows verified source spans, data transformations, and evidence.

## Sources

- **Kept:** upstream source at `https://github.com/backnotprop/plannotator/tree/v0.28.10` (shallow-cloned tag, commit `8c19f59`); local installed package/lock used to confirm matching version and dependency metadata; Visualizer files cited inline.
- **Dropped:** shipped `@plannotator/pi-extension` JavaScript bundles as implementation evidence; they are compiled package output, not the review UI’s maintainable source.

## Gaps

I did not build Visualizer or measure minified/gzipped route chunks. The 9.9 MB Pierre figure is installed package size, not download cost. Next step: after the concurrent node redesign settles, build the current app and a small `@pierre/diffs` branch, compare initial and lazy chunk bytes, then confirm worker and grammar assets load from the static CLI server with networking disabled.

## Start here

`app/src/components/ui/diff.tsx` — it already parses patches and implements split/unified layouts; it is the shortest path to a styled, syntax-highlighted prototype.
