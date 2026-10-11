# WP1 notes

## Tokens (`app/src/app/globals.css`)
- Colour (light/dark, `:root` / `html.dark`): `--ink`, `--ink-muted`, `--rule`, `--rule-strong`, `--signal-new/risk/wait/done`, `--code-bg`.
- **`--brand`, not `--accent`.** shadcn already owns `--accent` (neutral hover fill, used across ui/*). The spec's clay accent is `--brand` (`text-brand`).
- Tailwind classes via `@theme inline`: `text-ink`, `text-ink-muted`, `border-rule`, `border-rule-strong`, `text-brand`, `text-signal-*`, `bg-code-bg`.
- Type: `text-display`, `text-chapter`, `text-deck`, `text-pull`, `text-row-title`, `text-body`, `text-small`, `text-meta`, `text-label` (size + line height; mobile overrides under 720px). Set weight/family/tracking in the adapter (`font-serif`, `font-mono uppercase tracking-[0.14em]`).
- Signal values tuned to pass 4.5:1: light new `#3a7448`, risk `#b34e14`, wait `#2f6db3`; dark per spec. Light brand `#b0502f` (spec's `#c4623f` failed 4.5:1).
- Test: `app/src/app/signal-contrast.test.ts` (reads globals.css; checks signals, ink, ink-muted, brand vs page bg, both themes).

## Hook API (`scroll-active-provider.tsx`)
- `useChapterRegistry({ id, title })` — chapter adapters call it; registers on mount, unregisters on unmount. The chapter element must have `id={id}` for the rail to link and track it.
- `useChapterRegistry()` — returns `{ chapters, activeId, setActiveId }` (no-op outside a provider).
- `ChapterRegistryProvider` is mounted by `VisualArtifactRenderer`.

## Page shell
- `page-rail.tsx`: `RailLayout` (180px rail column + content at >=1200px), `PageRail` (sticky mini-TOC; "Contents" `<details>` below 1200px), `ChapterIndex` (inline titles joined by "·" in the hero). All hidden under 3 chapters, so the rail only appears once WP4's chapter adapter registers. Legacy `section` does not register.
- Renderer: bordered hero card removed; kicker (artifactType · date), display serif title (max 20ch), deck, container 1120px, 96px-ish gaps (`space-y-12` between nodes; chapters own their own spacing).

## Other changes
- `Figure`: bare by default, `framed` opt-in. `PanelCard`: top hairline only.
- `status.tsx`: new `toneSignal()`; `toneSurfaceClass` is now a 2px top rule in the signal colour (no fill, no pink); `StatusChip` is dot + mono word, no Badge.
- `break-all` -> `break-words` in ui/stepper, ui/definition-list, data-adapters (5 sites). `rg break-all` still shows code-block-structured and execution-trace (code/paths, intentional).
- `ui/card`: hairline border, no shadow, no fill; sm title now text-lg (>= body text-small); description uses text-small. `ui/prose`: `text-wrap: pretty`.

## Verify
- `pnpm lint`, `tsc --noEmit`: clean. `pnpm test`: 140 pass, 0 fail.
- Screenshots: `wip/wp1-{light,dark}-{desktop,mobile}.png`. Weekly report: no Figure border, words no longer split, status labels dot+word. Legacy `card`/`grid` still draw a hairline border (WP4 renders them bare). Rail not visible yet (needs WP4 chapters).

## Round 2: rail seeded on the server
- New `app/src/lib/artifacts/chapter-ids.ts`: `chapterId(title, nodePath)` (the single id source) and `collectChapters(nodes)` (walks the spec in document order, using renderer node paths `nodes.N[.children.M]`).
- `VisualArtifactRenderer` passes `collectChapters(spec.nodes)` to `ChapterRegistryProvider initialChapters`. The rail, the Contents disclosure, the chapter index and the grid are now in the server and static HTML, so nothing shifts after hydration.
- Seeded ids skip runtime registration. Runtime registration only adds chapters the seed missed.
- `PageRail` no longer sorts by DOM position during render, which also removes a hydration mismatch risk.
- `chapter-adapter.tsx`: the id line now uses `sharedChapterId`, plus one import line. Its local `chapterId` export is left for WP4 to delete.
- Test: `app/src/components/page-rail.test.tsx` (static render with 3 chapters has rail markup, with 2 chapters has none, and collectChapters builds nested paths).

## Round 3: visual review fixes
- `site-header.tsx`: Comments and Colab have `aria-label` (with the count when there is one). On mobile the hit area is at least 44 px: `min-w-[2.75rem]` plus an `::after` that extends 8 px above and below the 28 px button. Measured 44x44 at 390 px.
- `globals.css`: `--header-height: calc(3.5rem + 1px)`, which matches the sticky header's measured 57 px. The rail's `top` uses it; WP3's story stage can too.
- Mobile nav: `ChapterIndex` is removed. `ContentsDisclosure` renders once, under the hero, below 1200 px, with a 44 px summary (`min-h-11`). The desktop rail is unchanged.
- Hero deck: `line-clamp-2` from `sm` up and `line-clamp-3` on mobile, with the full text in `title`. The 52ch measure is kept.
- Test: `page-rail.test.tsx` checks there is exactly one disclosure and its summary is `min-h-11`.
