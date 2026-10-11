# Design System

> Visual direction for the renderer. The LLM picks nodes; the renderer owns CSS, layout, and component behavior.

## Identity

Visualizer artifacts should feel like polished technical reports: clear hierarchy, warm neutrals, intentional accents, readable data. Not a dashboard template. Not a slide deck. Not raw HTML cosplay.

## Token source

Tokens live in `app/src/app/globals.css`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#faf9f5` | `#151412` | page background |
| `--foreground` | `#141413` | `#f5f0e8` | primary text |
| `--card` | `#ffffff` | `#1f1e1b` | cards/panels |
| `--primary` | foreground | foreground | primary actions/emphasis |
| `--accent` | `#e3dacc` | `#3a332b` | soft emphasis |
| `--clay` | `#d97757` | `#e08a69` | primary accent, charts, focus |
| `--olive` | `#788c5d` | `#9faf7c` | success/secondary charts |
| `--rust` | `#b04a3f` | `#ef8f86` | destructive/risk |
| `--border` | `#d1cfc5` | `#454038` | dividers/borders |

Border radius base is `0.75rem`, scaled across semantic radius tokens.

## Typography

- Sans: Geist Sans (`--font-geist-sans`)
- Mono: Geist Mono (`--font-geist-mono`)
- Editorial/heading: `--font-editorial`

Headings use the editorial stack for report-like weight. Code and data use mono. Body uses sans.

## Reading layout

- `--va-content-max-width` is 96rem, or 1536px at the default font size. The desktop contents rail uses 160px with a 32px gap. Prose keeps its own 75ch maximum.
- Feedback panels reserve 360px outside the content column at viewport widths of at least 1280px. The chapter rail becomes a Contents disclosure while a panel is open.
- Below 1280px, feedback opens as a bottom sheet. It does not change the content width.
- Execution traces switch to side-by-side panes only when their own container reaches 60rem. Narrow traces stack the source above the call stack.
- Figures wrap into fewer columns before values collide. Map diagrams become connection lists below a container width of 44rem.
- Claims retain plain collapsible rendering. Feedback uses the same node boundary as every other component, without claim-specific comment controls.

## Component foundation

- Next.js + React renderer in `app/`.
- shadcn/Base UI primitives in `app/src/components/ui`.
- Lucide icons via `lucide-react`.
- Artifact primitives in `app/src/components/artifact-primitives.tsx`.
- Charts via Recharts.
- Markdown via `react-markdown` + `remark-gfm`.
- Code highlighting via Shiki.

## Node philosophy

The page reads like a short publication: one idea per chapter, calm type, whitespace and thin rules. It is clearly not a dashboard.

- Open with a `prose` thesis. Then one `chapter` per question: kicker, serif title, one-line deck, body, one takeaway.
- A chapter has one main exhibit (`steps`, `map`, `story`, `sequence`, `compare`, `ledger`, `checklist`, `table`, `columns`, `figures` or `code`), plus at most one supporting `prose`, `details` or `callout`.
- `ledger` holds facts grouped by what the reader must do. `checklist` holds work in progress.
- `figures` holds at most four numbers the reader acts on.
- `details` holds secondary detail. `callout` is used sparingly.
- Contract 3 rejects removed nodes, including `code-block`, `diff`, `log` and `call-stack`. Rewrite fixtures to surviving nodes; there are no renderer aliases.

### Anti-box rules

1. No card, tile or bordered container around ordinary content.
2. Status is a dot plus a mono word. Never a coloured pill or an emoji.
3. At most three signal colours per page: `--signal-new`, `--signal-risk`, `--signal-wait`. Everything else is `--ink` or `--ink-muted`.
4. At most 4 figures, 6 map nodes, 7 steps.
5. A chapter has one main exhibit, plus at most one supporting prose, details or callout, and one takeaway.
6. No uniform grids. Three equal things become `columns` with headings or a `ledger`.
7. Secondary detail lives in `details`.
8. Diagrams get a caption. A diagram of two nodes is a sentence.

## Editorial tokens

Defined in `app/src/app/globals.css`. Use these; do not hard-code colours or sizes.

| Token | Use |
|---|---|
| `--ink`, `--ink-muted` | text and secondary text |
| `--rule`, `--rule-strong` | hairline and heavy dividers, the chapter top rule |
| `--signal-new`, `--signal-risk`, `--signal-wait`, `--signal-done` | the only semantic colours; tuned to 4.5:1 on paper in both themes |
| `--brand` | the one accent (shadcn's `--accent` stays a neutral hover fill) |
| `text-display`, `text-chapter`, `text-deck`, `text-pull`, `text-row-title`, `text-body`, `text-small`, `text-meta`, `text-label` | the type scale, with mobile overrides under 720px |

Chapters register with the page rail (`useChapterRegistry`). The rail appears with three or more chapters.

## Diagram design

- `map` is the default for parts and links (6 nodes, 8 edges). `story` is a map plus beats shown on scroll. `sequence` is for messages over time.
- Proposed parts use `signal: "new"` or a `+` edge. Retired or optional paths use `-->`.
- `mermaid` is for diagram types the others cannot draw (ERD, class). `svg-diagram` is the escape hatch, rendered in a sandboxed iframe, and carries its own theme variables.

## Change semantics

Plan nodes mark what a change adds, changes or removes. These marks are tokens in `app/src/app/globals.css`, not one-off Tailwind colours.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--change-added` | `#5f7444` (olive, darkened for AA text on paper) | `#9faf7c` | `+` added |
| `--change-changed` | `var(--amber)` `#a86b12` | `var(--amber)` `#e0b45c` | `~` changed |
| `--change-removed` | `var(--rust)` | `var(--rust)` | `-` removed, with strike-through |
| proposed (pattern) | `--change-added` + `stroke-dasharray: 5 4` / `border-style: dashed` | same | proposed but not yet real |
| dashed edge (pattern) | `--muted-foreground` stroke + `stroke-dasharray: 2 4` | same | a node's own `dashed` meaning |
| `--canvas-dot` | `color-mix(in oklch, var(--slate), transparent 88%)` | `color-mix(in oklch, var(--slate), transparent 90%)` | diagram dot grid |
| `--amber` | `#a86b12` | `#e0b45c` | palette colour, `--color-amber` in `@theme` |

`--color-amber` and `--color-change-*` are mapped in `@theme inline`.

Colour is never the only signal. Every mark also has a glyph (`+ ~ - ?`) or a dash pattern, and an accessible name such as "added", "changed" or "removed".

### Diagram canvas

Plan diagrams (`state-machine`, `call-stack`, `map`) draw on a dot grid: the `.va-dot-grid` utility, a `--canvas-dot` radial-gradient on `--card` with a 16 px pitch. Diagrams that can overflow scroll horizontally in their own container and show a fade on the right edge.

### Two kinds of dashed line

- **Green long dash means proposed.** A `+` prefix or `mark: "proposed" | "added"` draws in `--change-added` with the `5 4` dash.
- **Muted short dash is the node's own `dashed` meaning.** A `style: "dashed"` edge draws in muted ink with the `2 4` dash. In `map` the `dashed` prop names it in the legend. The `sequence` reply style uses the same pattern.

Both can apply at once: a proposed dashed edge is green with the `2 4` pattern. `state-machine` and `call-stack` have no `style` prop, so there dashed always means proposed.

### Code colors

| Meaning | Token | Treatment |
|---|---|---|
| Added | `--change-added` | `+`, row tint 18%, word tint 32%, added count |
| Removed | `--change-removed` | `−`, row tint 18%, word tint 32%, removed count |
| Paired change | `--change-changed` | split divider tick |
| Focus | `--source-focus` | 18% tint, blue range bracket, filled pin |
| Note `ok` | `--signal-new` | filled pin, bracket, text underline |
| Note `risk` | `--signal-risk` | filled pin, bracket, text underline |
| Note `warn` | `--signal-wait` | filled pin, bracket, text underline |
| Note `info` | `--ink` | filled pin, bracket, text underline |
| Note `idea` | `--brand` | filled pin, bracket, text underline |

Source focus aliases the existing blue palette through `--signal-wait`; idea notes remain `--brand`. Source uses 14px mono on a 24px pitch, or 13px in narrow containers. Context uses `--ink-muted` at full opacity. Note ranges use 12% tint.

Diff notes use only `info`, `risk` and `idea`, so green keeps one meaning. Notes are plain text, not tinted cards. Dense notes, four or more averaging fewer than three source rows per note, render inline. Other desktop notes use the collision rail beside a content-height source block. Tints use `color-mix(in oklch, ...)`. Color always accompanies a number, glyph or accessible label.

Shiki uses GitHub high-contrast themes. A syntax color that fails 4.5:1 against conservative code/tint bounds falls back to that theme's foreground. No palette colors are edited. `code-contrast.test.ts` checks every theme JSON foreground.

Callout tones remain separate from status `ToneSchema`. Keep Geist Sans, Geist Mono and the existing editorial serif. Walkthroughs and trace frames use sans labels and mono source.

## Sources of truth

- Tokens/theme: `app/src/app/globals.css`
- shadcn config: `app/components.json`
- Node catalog: `app/src/lib/contract/artifact-manifest.ts`
- Renderer primitives: `app/src/components/artifact-primitives.tsx`
- Diagram rules: [`design-docs/diagram-sandboxing.md`](./design-docs/diagram-sandboxing.md)
