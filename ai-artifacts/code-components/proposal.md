# Code components proposal

## Recommendation

Upgrade `code` first; do not add a `code-walkthrough` node in v1. Teach agents to compose `chapter` and `code` for walkthroughs. Keep legacy `diff` rendering through the upgraded code renderer. Do no separate `execution-trace` restyle; let call-stack excerpts inherit the new code presentation, with one small panel cleanup only if the redesign has not already handled it.

Sequence implementation after the concurrent `code` redesign work package lands. This keeps the agent contract at 18 nodes and avoids conflicting edits.

## 1. Upgrade `code`

**Purpose.** Make `code` the single surface for snippets, annotated explanations, and unified or split diffs. Preserve current `annotations`, `src`, and `diff: true` behavior while adding bounded line-range notes and explicit diff presentation.

**Example JSON.** This example uses the existing `code` shape plus proposed props:

```json
{
  "type": "code",
  "props": {
    "file": "src/retry.ts",
    "language": "typescript",
    "code": "@@ -12,1 +12,1 @@\n- const pending = new Map();\n+ const pending = new LruCache({ max: 250 });",
    "diff": true,
    "diffMode": "split",
    "annotations": [
      { "line": 12, "endLine": 12, "side": "new", "title": "Bounded cache", "body": "Settled retries no longer accumulate without limit.", "tone": "ok" }
    ]
  }
}
```

**Port vs. depend.** Port the split/unified interaction, line gutters, range-end annotation marker, and word-level change emphasis from Plannotator's `packages/review-editor/components/DiffViewer.tsx` and its annotation model in `packages/ui/types.ts` / `packages/review-editor/utils/annotationScope.ts`. Keep our DOM renderer and Shiki; do not import `@pierre/diffs`. Add the small `diff` npm package (BSD-3-Clause; Plannotator uses it directly) for line and word diffs instead of maintaining the current O(n×m) LCS. Record it in `NOTICE`. Keep `diff` node as a legacy alias and route its adapter through the new renderer.

**Implementation.** Extend `annotations` with optional inclusive `endLine` and `side: "old" | "new"`; do not add a parallel `notes` prop. Keep the four existing tone values and render each as a left rule plus a word label, mapped to the redesign's signal/ink palette. Add optional `diffMode` (default unified), `file`, and a code size cap (recommend at most 16 KB and 400 lines). For diffs, parse `@@` headers for old/new line numbers; pair adjacent removals and additions for split rows and word highlights. If the input cannot be paired safely, render unified. On narrow screens, use unified layout and stack the note rail below its range.

Use one flat `--code-bg` surface with no outer card. Put file and `+N −N` stats above it in mono. Separate split columns with `--rule`; mark changed rows with `+`/`−` and `--change-added` / `--change-removed`. Do not use `--signal-risk` for deletions. Notes sit beside their range on wide screens: a colored rule, tone word, title, and muted body; no pills or tinted boxes. Keep note text selectable in the normal DOM so existing `textSnippet` comments continue to work.

**Files to add or change.** Extend `shared/src/plan-schemas.ts`; update code-node validation/types in `shared/src/artifact-schema.ts` and the agent-facing examples in `shared/src/contract.ts`. Restyle and extend `app/src/components/ui/code-block-structured.tsx` and `app/src/components/ui/diff.tsx`; wire props and legacy `diff` compatibility through `app/src/components/adapters/leaf-adapters.tsx` and `app/src/components/component-registry.tsx`. Add the `diff` dependency and license notice. Update `skill/SKILL.md` and its references, `ai-artifacts/docs/nodes.md`, `app/scripts/verify/verify-artifacts.ts` fixtures, schema/DOM tests, and run `pnpm export:contract`.

## 2. Walkthrough recipe, not a new node

**Purpose.** Give agents an ordered, concept-first explanation beside source code without duplicating `code` props or expanding the 18-node contract. Use one `chapter` per idea, with its kicker naming the file, deck explaining why it matters, and one `code` child with annotations. Prefer `src` when the excerpt should be inlined from source.

**Example JSON.**

```json
{
  "type": "chapter",
  "props": {
    "kicker": "src/retry.ts",
    "title": "Cap pending work",
    "deck": "The cache bounds retained retry state when jobs fail repeatedly.",
    "takeaway": "Settled work cannot grow the cache forever."
  },
  "children": [
    {
      "type": "code",
      "props": {
        "language": "typescript",
        "code": "const pending = new LruCache({ max: 250 });",
        "startLine": 12,
        "annotations": [
          { "line": 12, "title": "The cap", "body": "Old entries are evicted.", "tone": "ok" }
        ]
      }
    }
  ]
}
```

**Port vs. depend.** Borrow concept order, section overview, and file linking from `packages/core/guide.ts` and `packages/guide-viewer/GuideView.tsx`. Adapt these to existing `chapter` typography and the `code` margin rail. Add no library and no renderer node. Do not port checkboxes, file chips, or an “Everything else” section; static artifacts have no PR file set to reconcile.

**Files to add or change.** Add the recipe and a concise example to `skill/SKILL.md` and its references, and document it in `ai-artifacts/docs/nodes.md`. No schema, adapter, or contract-manifest change is needed. If Iury later approves a dedicated node, make it a container of 1–6 `code` children, not a second copy of code/source props.

## 3. Existing call-stack and execution-trace nodes

**Purpose.** Keep their distinct jobs: `call-stack` is a compact call path; `execution-trace` presents source-verified events. They are not a separate redesign work package. Call-stack excerpts inherit the new `code` rendering automatically.

**Example JSON.** Existing call-stack payloads stay valid; for example, a row can carry `call`, `depth`, `kind`, `at`, and an `excerpt` with code, language, and start line. No execution-trace example is needed because this proposal does not change its payload or renderer behavior.

**Port vs. depend.** No new Plannotator code or library. Reuse the updated code renderer only where call-stack already displays `StructuredCodeBlock`; do not refactor execution-trace's separate tokenization as part of this work.

**Files to add or change.** None for execution-trace beyond the node-redesign scope, which only removes its outer `Figure`. If still present after that work, remove the `border-t bg-muted/30 p-3` excerpt panel in `app/src/components/adapters/plan/call-stack-adapter.tsx`. Do not change either schema.

## Risks

- Hand-authored diff hunks can make split pairing ambiguous; fall back to unified rather than misaligning lines. Validate old/new side ranges and reject overlapping or out-of-bounds annotations.
- Code caps may reject large excerpts; return an actionable validation error telling agents to split them. Check the `diff` package's bundle contribution and verify lazy Shiki chunks load from the static `out/` export without a network connection.
- Check Shiki token contrast against `--code-bg` in both themes. Check that the margin rail stacks cleanly on mobile and does not overlap horizontally scrolling code.
- `@pierre/diffs` stays out of v1: its Shadow DOM blocks our DOM selection/text-snippet comments and token theming; its Vite-inlined worker conflicts with static export; its installed package is about 9.9 MB unpacked. Revisit only if real artifacts need large-file virtualization.
- Land this after the concurrent redesign work. The code schemas, adapters, registry, and styles are being edited in parallel.

## Open questions for Iury

1. Approve extending `code` with `endLine`, `side`, `diffMode`, `file`, and a size cap, or keep the current contract unchanged? **Recommendation:** approve the bounded additions and record the spec change.
2. Which diff colors should ship: `--change-added` / `--change-removed`, or the signal hues? **Recommendation:** use `--change-*`; signals mean new, risk, or waiting, not line changes.
3. After trying the `chapter` + `code` recipe, should we consider a `code-walkthrough` container? **Recommendation:** no new node unless the recipe proves insufficient; if approved, let it contain `code` children.
4. Start implementation only after the redesign's `code` work package merges? **Recommendation:** yes, to avoid conflicting edits.

## Where we disagree with the review

None. This proposal applies the review's verdicts, including deferring the walkthrough node, dropping a separate trace restyle, using `diff` rather than `@pierre/diffs`, and keeping legacy `diff` compatibility.
