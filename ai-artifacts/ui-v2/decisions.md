# Cycle 1 decisions

## Cycle 1 design pass

Keep Geist Sans, Geist Mono and the editorial serif. Colour identifies source focus, changes and note intent. Source reading takes priority over empty space.

| Before | After | Why |
|---|---|---|
| 988px exhibit at 1440px with comments closed | 1184px exhibit, 96rem page cap and a 160px contents rail | Use the viewport for source and diagrams; prose keeps its 75ch measure |
| Small source, brown focus and faded context | 14px source, blue focus and full-opacity muted context | Make the selected range distinct without sacrificing contrast |
| Dense notes stretch the whole source background | Dense notes inline; ordinary notes in a plain rail | The note explains the range without creating an empty slab |
| 40svh empty step slots | Compact ordered steps with file and line labels | The whole route is visible beside its source |
| Faint repeated symbols, full paths and deep indent | Narrative frame label first, symbol and basename below, at most 24px depth | Distinguish frames even when they call the same symbol |
| Fixed 384px stack and minimum 320px source slab | Stack takes 42% up to 512px; source height follows its content | Spend width on frame identity and remove unused source space |
| Map disappears when comments resize its container | Unique Mermaid ID for every render; QA waits for mounted drawings | Mermaid was removing the old SVG while React saw an unchanged HTML string |
| Thin callout stripe | Full semantic outline and quiet tone fill | Risk, new and waiting advice remain visible in either theme |

Callout icons and coloured titles stay. Neutral notes use plain horizontal rules instead of a box. Callout and inline source explanations cap their measure at 75ch. Prose, chapters, ledgers, checklists, figures, process steps, comparisons, timeline, trend, file trees, links, quotes, claims and specialised diagram frames retain their existing hierarchy. Tables keep their row-hover transitions and reduced-motion overrides unchanged. Large specialised Mermaid diagrams still need zoom for detail; the ordinary map has a readable connection-list fallback.

The wider-component sweep exposed a real resize bug, not a styling preference. Preserve mounted maps during same-layout rerenders by giving Mermaid a fresh ID. The capture harness now checks map and story drawings after opening comments so an empty diagram cannot pass as visual evidence.

Trace selection uses the same blue pin, full outline and fill as walkthrough focus. Return, throw and boundary glyphs use success, risk and focus colours. Boundary outcomes retain their word and dot. Abbreviated row locations expose the full path through an accessible name and native title; the source header keeps the full path. On desktop the source stays in view alongside a long stack. Inspector columns have dividing rules, and empty inspectors disappear. The schema stays unchanged.

Walkthroughs split at 900px container width, not 720px. Smaller containers use excerpts. The desktop pane still follows scroll, but clicking or paging changes the source locally without jumping the page. Keyboard selection stays instant. The active step gets a blue pin, full outline and soft fill. Inactive pins keep their note intent. Mobile navigation scrolls the selected excerpt beneath the sticky navigation.

Source focus gets `--source-focus`, an alias of the existing blue palette through `--signal-wait`, and an 18% focus fill. Brand and idea notes stay clay. Added and removed rows use 18% tint; changed words use 32%; note ranges use 12%. Every mark retains its number, glyph or bracket. Conservative syntax contrast bounds cover the stronger fills. Context uses `--ink-muted` rather than 55% opacity. The 24px row pitch stays fixed, including mobile, so note anchors remain aligned. Four or more notes averaging fewer than three source rows per note use inline explanations at every width. Less dense notes keep their measured collision rail and connectors.

The comments panel stays 360px. At 1440px with comments open, exhibits retain 1016px. Mobile gutters and the bottom sheet stay unchanged. No contract or CLI change.

### Design verification

`gate-cycle-1.sh` passes: shared build, app lint, TypeScript, 238 app tests, contract export, production build and 319 CLI tests. `pnpm verify:artifacts` passes 4 specs, 2 bundles and 31 manifest entries and examples. The final 104 real-sample captures have no page overflow or console errors. Another 16 fixture captures cover 768px, 1024px, 1280px and 1920px, both themes and sidebar states. Local step navigation, keyboard selection and selected trace boundaries pass. The table row-hover transition remains 100ms. All inspection uses headless agent-browser on port 9991; the standard visual QA script launches its own Chrome, so these repeatable agent-browser checks replace it for this task.

## Earlier cycle 1 implementation decisions

- Follow the coordinator's removal rule. Major 3 accepts `code`, `walkthrough` and `execution-trace`, without aliases for removed code nodes. `call-stack` leaves both the schema union and renderer registry.
- Keep the current typefaces and palette. Extend the source styles in `globals.css`; use semantic colors only for changes, focus and note intent.
- Split diffs use their container width and p90 line length. Measured note heights drive collision placement; displaced notes get connectors. Narrow notes appear after their inclusive range end.
- Story currently uses a scroll listener, not IntersectionObserver. Share its 45% reading-line calculation; walkthrough adds the specified observer band and keeps a throttled scroll update for long steps.
- Keyboard source navigation is instant. Mouse navigation uses smooth scroll; reduced motion is instant. File switches fade only after reader interaction, never on page load.
- Trace depth comes from ordered call, return and throw events. Show at most six indentation guides so deep paths cannot consume the whole narrow row; frame order and symbols remain visible.
- Source reads use existing canonical containment and aggregate budgets. Validate ranges again after inlining, including walkthrough steps. Explicit inline code wins over `src` without reading disk.
- Preserve external historical bundles. Rewrite repository fixtures and the task's staged sample copies only, not the user's original artifact store.
- Contrast check found GitHub light high-contrast comments at 4.35:1 on `--code-bg`. No bundled light theme passed every sampled syntax color on that surface. Keep the high-contrast themes and fall back to their foreground for ordinary rows, or semantic `--ink` on stronger word emphasis, rather than hand-editing a palette. The test checks every theme JSON foreground against conservative row and word tint bounds. This is a deliberate deviation from the proposed theme-swap-only approach.

- Remove `claim.ref` with its call-stack target. Every such reference was already invalid without that node; do not advertise or render a dead jump link, or invent a replacement reference scheme.
- Unequal diff pairing stays monotonic so reordered similar lines cannot disappear. Headerless handwritten patches respect `startLine`.
- Layer range tint over change tint instead of erasing added/removed row meaning. Check stronger word emphasis separately; keep ordinary syntax colors when they pass.
- Add Lua to the existing highlighter for the real nice-mermaid excerpts. Only file paths use mono in the header; explanatory titles use the existing sans body scale.
- The nine-frame trace fixture is explicitly illustrative, not a runtime capture. Its source hash matches the inline example. The trace's About text distinguishes all four provenance modes.
- Keep large screenshot PNGs local and ignore them; commit the acceptance manifest and repeatable generation/capture scripts. Wait for the mounted toolbar before browser interaction to avoid pre-hydration DOM instrumentation.

- Live artifact updates clamp the active step or frame to the remaining list. Old-side walkthrough focus follows old line numbers, including shifted context rows; unified diffs show both number columns. Source pin numbers follow sorted frame positions, not arbitrary event order values.
- Shared context rows can carry old and new note pins and underlines. Reserve gutter space consistently for coincident step pins, and compute token offsets before rendering in linear time.

- The injected pnpm `file:../shared` package retained a stale copied `code-schemas.js` after rebuilds. The gate now restores local output hardlinks after the shared build and refuses any runtime path outside this worktree. A regression for empty comparison-side annotations exposed this mismatch.

## Component critique and re-check

| Before | After | Why |
|---|---|---|
| Rounded boxed snippets and tinted note cards | Flat source surface, filled pins, plain notes | Emphasis identifies the relevant source, not the container |
| Separate source and diff paths | Shared rows, tokens, numbering and copying | Line references have one implementation |
| A sequence of captions without source navigation | Ordered walkthrough with active range and per-step mobile excerpts | The reader can follow a multi-file route |
| Fixed stack rows with truncated labels | Auto-height frame rows, visible locations and full-width inspector | Frame identity survives an open feedback panel |

Automated re-checks cover ranges, collisions, diff pairing, keyboard behavior, narrow excerpts, reduced motion and theme contrast. Screenshot evidence is recorded in the cycle 1 QA results.
