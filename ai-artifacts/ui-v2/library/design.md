# Artifact library: design

Status: design pass for VAR 3 (`ui-v2`). No app code changed.
Recommendation: **Direction A, Catalogue**, with the "Now" strip from Direction B on top.

## 1. What is wrong today

Screens: `screens/current-*.png` (1440 and 390, light and dark).

1. **Half the library is unreachable from home.** The home index is cut to 100 rows in both `app/src/lib/artifacts/dev-api.ts:84` and `cli/src/commands/serve.ts:316`. The store holds 201. The sidebar says "All projects 100".
2. **Recency is fake.** Order comes from file mtime. 42 artifacts share the minute `2026-07-08T00:21`, 24 share `2026-07-30T19:47` and 13 share `2026-10-11T21:28`. These are batch rewrites, not real edits. Only 1 of 201 specs has `createdAt`.
3. **Projects are not projects.** 41 project folders, 23 of them with a single artifact. At least eight folders describe one repo (VAR itself): `var` (55), `visualizer`, `visual-artifact-renderer`, `va-create-src-dhmktu`, `node-redesign`, `node-redesign-proj`, `ui-v2`, `ui-v2-samples`. Five `review-pr-*` folders are really "repo + PR"; four of them are reviews of `iurysza/herdr-tab-smart-rename`.
4. **The project rail is a 41-row list in arbitrary order.** On 390 it becomes a select. No grouping, no recency, no counts that mean anything.
5. **Copies look like new work.** 15 title groups have duplicates. `ui-v2-samples` holds 12 copies of artifacts that live in other projects. "agents2: what changed this week" exists 3 times.
6. **Versions look like siblings.** `visualizer-maintainability-refactor` v1 to v4 show as four identical rows.
7. **Test litter mixes with real work.** About 20 artifacts are tests, smoke checks, repros or demos (`Hello`, `Test`, `Share Test`, `Reorg Test`).
8. **Comments are invisible.** 15 artifacts carry 27 comment threads, 19 still open. Nothing on home says so. 35 artifacts are published to Cloudflare; nothing says that either.
9. **The project page is a card stack.** Big bordered cards, a locale date, and no way to filter, search or see how artifacts relate.

What works and stays: the editorial header, serif titles, mono labels, day grouping as an option, and the hairline row style.

## 2. The corpus in numbers

From `tools/corpus.py` (read-only over `~/.agents/skills/visual-artifact/artifacts`, 2026-10-12).

| Measure | Value |
|---|---|
| Artifacts | 201 |
| Project folders with artifacts | 41 (23 with one artifact) |
| Largest projects | var 55, flue-pi-agent 24, agents 22, project-atlas 13, ui-v2-samples 12 |
| Types | explainer 61, report 56, review 26, plan 18, idea 16, diagram 12, comparison 7, dashboard 3, none 2 |
| Distinct topics | 493, of which 361 (73%) appear once |
| Topics shared across 2+ projects | 85 (pi 8 projects, herdr 7, architecture 6, visual-artifact 6) |
| Artifacts sharing a topic with another artifact | 182 |
| Updated in the last 7 days | 34 |
| By month | Jun 18, Jul 128, Aug 8, Sep 12, Oct 35 |
| Open comment threads | 19 open, 8 resolved, on 15 artifacts |
| Published | 35 |
| Duplicate-title groups | 15 |
| Title-prefix series | Feature Review x8, Agent Benchmark x6, Home proposal / Visualizer Home x7, PR #n x4, numbered 01 to 04 x4 |
| Tests, smoke, repro, demo | about 20 |
| Missing description / type / topics | 9 / 2 / 2 |
| Specs that link another artifact | 1 |

What this tells us:

- **Type is a good facet.** Eight values, well spread, always present.
- **Topic is a bad facet and a good connector.** 73% singletons make a topic list useless as a filter. Shared topics still link 182 artifacts, so topics should power "related", not the sidebar.
- **Project is the main way in, but it needs cleaning.** Group projects by repo, and fold one-artifact projects away.
- **Series and versions are real and common.** Around 35 artifacts belong to a run, a review round or a version chain. The data does not record this; titles do.
- **Time needs a real created date.** Without one, any "recent" view is wrong.

## 3. Information architecture

### 3.1 Objects

| Object | Meaning | Source today | Source in v3 |
|---|---|---|---|
| Artifact | One rendered spec | `artifact.json` | same |
| Project | The folder the agent wrote to | folder name | same, plus `source.repo` |
| Repo | Where the work lives | guessed from text (18 artifacts) | `source.repo`, filled by the CLI from `git remote` |
| Series | A run of related artifacts: rounds, parts, versions | title prefixes | `series.id` + `series.part`, set by the agent |
| Copy | Same artifact in another project | equal titles | `copyOf`, set by the CLI when it copies |
| State | draft, current, superseded, archived, fixture | none | derived plus a user action, see 3.6 |

### 3.2 Home: three zones

1. **Now** (top strip). The last 7 days of real work, plus anything with open comments. Today: 34 recent, 15 with open threads. Shows at most 6 rows; "Show all" applies the filter `updated:7d`.
2. **Catalogue** (main). One dense list of all 201 artifacts, never truncated. Rows show type label, serif title, project, series marker, comment count, published mark and relative date. Default group: by week. Other groupings: project, type, series, none.
3. **Facet rail** (left at 1024+, a sheet at 390). Facets with live counts: Type, Project (grouped), State. Topics are not a facet; they are search terms and chips.

### 3.3 Projects in the rail

- Group by repo when `source.repo` exists. "visual-artifact-renderer" holds `var`, `ui-v2`, `node-redesign`, and so on.
- Sort by last activity, not alphabet.
- Show the 8 most active. Fold the rest into "23 more, one artifact each".
- Each row: name, count, a 12-week activity tick strip. The strip is mono text, not a chart library.

### 3.4 Search

- Always visible at the top. `/` and `Cmd-K` focus it.
- Searches the full index client-side. 201 rows with title, description, topics and project is under 100 KB. No server search needed until about 5,000 artifacts.
- Ranking: title 3, topics 2, project 2, description 1. Prefix and fuzzy match on words.
- Operators, all optional, shown as chips once typed: `type:review`, `project:var`, `repo:herdr-tab-smart-rename`, `topic:pi`, `series:agent-benchmark`, `is:open`, `is:published`, `is:archived`, `updated:7d`.
- The URL holds the full query (`?q=type:review is:open`). The current page already keeps filters in the query string; extend that.
- Empty result: show the query, the nearest topic matches and a "clear filters" action.

### 3.5 Connections

On every row, and in full on the artifact page:

- **Series.** `Agent Benchmark · 3 of 6`. The row shows the latest part; earlier parts fold under it with a count.
- **Versions.** `supersedes` chains collapse to the newest. Older versions show as "v3, v2, v1" under it. `visualizer-maintainability-refactor` becomes one row with 3 older versions.
- **Copies.** Equal `copyOf` (or equal title, as a fallback) collapse to one row with "+2 copies". `ui-v2-samples` stops doubling the library.
- **Related.** Up to 5 artifacts ranked by shared topics, same repo and same series. Shown on the artifact page and in the row's expand panel. Topic overlap gives 182 artifacts at least one link today.
- **Repo and PR.** A review shows `herdr-tab-smart-rename #6`. Clicking filters by `repo:`.

### 3.6 State and noise

| State | Rule | Default view |
|---|---|---|
| current | default | shown |
| superseded | another artifact names it in `supersedes` | folded under the newer one |
| copy | has `copyOf` | folded under the original |
| fixture | `purpose: "fixture"`, or legacy topics `smoke-test`, `test-fixture`, `renderer-test` | hidden; `is:fixture` shows them |
| archived | user action, stored in a sidecar | hidden; `is:archived` shows them |

Archive is a user action in the row menu, stored in `<slug>/library.json`. The spec stays untouched.

### 3.7 Project page

- Header: project name, repo link, artifact count, date span, type breakdown as a one-line mono legend (`12 explainer · 3 diagram · 1 review`).
- Search box scoped to the project (`project:<name>` pre-filled and removable).
- **Series** section first when the project has any, each as a compact table.
- **All artifacts** as the same catalogue rows, grouped by week.
- Right column at 1280+: topics in this project with counts, open comments, related projects (shared topics).
- Back link keeps the home query (`homeFilterSearch` already exists).

## 4. Contract change

Keep the agent burden small. The CLI fills what it can find; the agent adds two optional fields.

```jsonc
// artifact.json (agent-written, all optional)
{
  "series": { "id": "agent-benchmark", "title": "Agent benchmark", "part": 3 },
  "supersedes": "visualizer-maintainability-refactor-v3",
  "purpose": "fixture"            // only for tests and demos
}
```

```jsonc
// meta.json (CLI-written sidecar, never edited by agents)
{
  "createdAt": "2026-07-30T19:47:00Z",   // first write, never changed
  "updatedAt": "2026-07-30T19:47:00Z",   // content hash changed
  "contentHash": "sha256:…",
  "source": { "repo": "iurysza/flue-pi-agent", "ref": "main", "pr": null },
  "copyOf": null                          // "project/slug" when the CLI copies
}
```

Why a sidecar: dates and git facts are facts about the write, not the content. Agents get them wrong; the CLI gets them right. `updatedAt` only moves when `contentHash` moves, which fixes the batch-rewrite problem.

Backfill: one CLI command, `visual-artifact reindex`, writes `meta.json` for existing artifacts. It uses the earliest of mtime and `publish.json` dates for `createdAt`, infers series from title prefixes (`Feature Review —`, `Agent Benchmark —`, `NN ·`, `-vN`), and marks copies by equal title in `ui-v2-samples`. It prints what it inferred and asks before writing.

Index change: the `/index.json` payload drops the 100-row cap, adds `series`, `supersedes`, `purpose`, `meta`, `openThreads` and `published` per row.

Skill change: `skill/SKILL.md` asks agents to set `series` for multi-artifact runs and review rounds, and `supersedes` when they revise an artifact under a new slug.

## 5. Directions

Mocks use real titles and counts from the corpus, the v2 tokens (ivory/slate, clay brand, hairline rules), Geist Sans, Geist Mono and the editorial serif. All mocks follow the theme in `localStorage['visualizer-theme']` or the system setting.

### A. Catalogue (recommended)

`mocks/a-catalogue-home.html`, `mocks/a-catalogue-project.html`

A library catalogue. Facet rail, one dense ruled list, search with operators. Rows borrow the table adapter Iury likes: hairline rules, row-hover fill, mono labels, serif titles. Colour only means something: blue for open comments, green for new this week, muted for superseded.

- Strong: scales to thousands of rows, makes every artifact reachable, search and facets do the work, matches the artifact page's type system.
- Weak: less "at a glance" delight than a visual grid.

### B. Desk

`mocks/b-desk-home.html`

A working desk. Big "Now" area with the last week as large tiles, then projects as shelves, each a horizontal row of its newest artifacts.

- Strong: answers "what was I doing" instantly. Pleasant to open.
- Weak: shelves break down with 41 projects and 201 artifacts. Old work is hard to reach. Search is secondary.

### C. Atlas

`mocks/c-atlas-home.html`

A map. Repos as regions, artifacts as dots, shared topics as connections. Click a region to list its artifacts.

- Strong: shows connections, which no other direction does well. Good for "what do I know about pi".
- Weak: 73% singleton topics make the map sparse and noisy. Hard on 390. Poor for finding one known artifact.

### Recommendation

Ship **A**, and take two pieces from the others:

- From B: the "Now" strip at the top of home.
- From C: the "Related" panel on rows and on the artifact page. It gives the connection value without a map.

## 6. Visual rules

- Width: 96rem max, the existing content width. Rail 15rem. List measure is not capped; titles truncate at 2 lines.
- Row: 1px `--rule` top border, `odd:bg-muted/15`, hover `bg-muted/55` with the table adapter's transition, `motion-reduce` respected.
- Type label: mono, 12px, uppercase, `tracking-[0.14em]`, `--ink-muted`. No coloured pills for type; eight colours would carry no meaning.
- Title: editorial serif, `--fs-row-title`.
- Meta line: Geist Sans 14px, `--ink-muted`, tabular numbers for dates and counts.
- Signals: `--signal-wait` dot + count for open comments, `--signal-new` "new" for under 7 days, `--brand` for focus and the active facet, strike-free muted text for superseded.
- Mobile (390): rail becomes a "Filters" sheet; Now strip becomes a horizontal scroller; rows drop the project column into the meta line.
- Dark: same tokens, `.dark` on `html`. No new colours.

## 7. Implementation order (for a later goal)

1. Remove the 100-row cap in both index builders. Smallest useful change.
2. Add `meta.json` writing to `visual-artifact create`, plus `reindex`.
3. Extend the contract with `series`, `supersedes`, `purpose`. Run `pnpm export:contract`.
4. Build the catalogue list and facet rail, replacing `artifact-index-loader.tsx`.
5. Add search operators and URL state.
6. Rebuild `project-index-loader.tsx` on the same row component.
7. Add the Related panel to the artifact page.

## 8. Open questions

1. Should projects be renamed to repos in the UI, or should repo stay a grouping above projects? The plan keeps both.
2. Should `ui-v2-samples` copies be deleted rather than folded? Folding is reversible; deleting is cleaner.
3. Is archive a local-only action, or should it sync to published copies?
4. Should the agent or the CLI own `series`? The plan says agent, with CLI inference only for backfill.
5. Are the 19 open comment threads real review work? Many read like test notes ("asda", "nice terst"). If so, `is:open` needs a "dismiss" action, not only "resolve".
