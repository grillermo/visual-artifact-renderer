# Cycle 1 acceptance

## Result

The final gate passes shared build, lint, TypeScript, **234 renderer tests**, contract export, production build and **319 CLI tests**. Repository verification passes **4 specs**, **2 bundles**, **31 manifest entries and examples**, contract sync and resource limits.

The headless acceptance matrix passes **52 of 52 captures**: all 12 entries in `../samples-v3.json`, plus `ui-v2/code-walkthrough-fixture`, at 1440 and 390 pixels in light and dark with comments open. Every capture reports zero horizontal page overflow and zero console errors. The 24 source-bearing captures include VAR, cloud-agent box, nice-mermaid, Pi extensions, the diagram gallery and the fixture.

## What was checked

- Unified diffs show old/new numbers, change glyphs, paired word emphasis and inclusive annotation brackets. Split diffs use the source container and line-length fallback.
- Dense desktop notes preserve their source anchors and use five collision connectors in each theme. Mobile notes follow the range end. Long source stays inside its own horizontal scroller.
- Wide walkthroughs use a sticky source pane. At 390 pixels, excerpts stack, the source pane is absent and the horizontal step navigator stays beneath the header.
- The nine-frame trace wraps frame identity and location. Mobile starts with a collapsed stack; the source and inspector remain separate.
- DOM regressions cover old-side focus on shifted context rows, eight coincident step pins, sparse event order values, keyboard/reduced-motion navigation and lists shrinking during live artifact updates.
- Lua highlighting and sans explanatory titles were re-checked on the real code excerpts. File paths retain mono. Syntax foreground checks cover both high-contrast themes on conservative row and word tint bounds.

The fixture's trace is explicitly illustrative, not a runtime recording. Original historical bundles were not migrated; only repository fixtures and the task's staged copies changed.

## Reproduce

Run from this worktree, with its existing webpack development server on port 9991:

```bash
VISUAL_ARTIFACT_OPEN=0 bun ai-artifacts/ui-v2/qa/prepare-cycle-1.ts
bash ai-artifacts/ui-v2/qa/gate-cycle-1.sh
cd app && pnpm verify:artifacts && cd ..
VISUAL_ARTIFACT_OPEN=0 node ai-artifacts/ui-v2/qa/capture-cycle-1.mjs
```

The gate refreshes pnpm's injected shared outputs within this worktree before checking the app. It refuses a dependency runtime outside this root. The capture waits for the mounted toolbar before browser interaction to avoid hydration instrumentation errors.

`results.json` records the matrix and screenshot filenames. PNGs remain local and are ignored because the full evidence set is about 40 MB. No headed browser was opened, no forbidden server port was used and nothing was pushed.
