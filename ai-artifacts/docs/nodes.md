---
description: "Node reference for the 31 artifact node types in contract version 2.0.0, with legacy replacements."
---

# Node reference

> Generated from `cli/assets/contract.json`. Run `visual-artifact contract` or `visual-artifact contract --node <type>` for the live version. Source of truth: `shared/src/contract.ts`.

Pages are built from **chapters**. Each chapter holds one main exhibit, plus at most one supporting prose, details or callout, and one takeaway. See [`DESIGN.md`](./DESIGN.md) for the anti-box rules and [`skill/references/content-types/recipes.md`](../../skill/references/content-types/recipes.md) for the five page shapes.

## Core nodes

### `chapter`

A page chapter: mono kicker, serif title, one deck line, children, then one pull-line takeaway. Replaces section and heading. Each chapter is a rail/TOC entry. Do not number titles.

| Prop | Type |
|---|---|
| `kicker` | string ≤40? |
| `title` | string ≤80 |
| `deck` | string ≤200? — one plain sentence |
| `takeaway` | string ≤160? — the quotable line |
| `signal` | "new" \| "risk" \| "wait"? — colours the takeaway rule |

Children: nodes

```json
{
  "type": "chapter",
  "props": {
    "kicker": "Memory",
    "title": "Long sessions keep their facts",
    "deck": "Facts are saved before the model summarises.",
    "takeaway": "Save first, summarise second."
  },
  "children": [
    {
      "type": "prose",
      "props": {
        "content": "Memory writes decisions down before compaction runs."
      }
    }
  ]
}
```

### `prose`

Markdown text for prose, lists, links, and long-form narrative. Use this instead of 'text' when you need multiple paragraphs or basic markdown formatting.

| Prop | Type |
|---|---|
| `content` | string |
| `tone` | default \| muted? |

```json
{
  "type": "prose",
  "props": {
    "content": "Here is a list of items:\n\n- First item\n- Second item\n\n[Learn more](https://example.com)"
  }
}
```

### `columns`

2 or 3 text columns with a top rule and no boxes. Children: prose, figures, checklist, links or quote only (no diagrams, no nested columns). A prose child starting with '### Heading' gets a mono caps label.

| Prop | Type |
|---|---|
| `count` | 2 \| 3? — defaults to the number of children |

Children: nodes

```json
{
  "type": "columns",
  "props": {
    "count": 2
  },
  "children": [
    {
      "type": "prose",
      "props": {
        "content": "### Before\nTwo writers, one file."
      }
    },
    {
      "type": "prose",
      "props": {
        "content": "### After\nOne owner per file."
      }
    }
  ]
}
```

### `callout`

A margin note: coloured left rule, tone icon, short title, body. No fill, no box. At most two per chapter.

| Prop | Type |
|---|---|
| `tone` | "note" \| "risk" \| "new" \| "wait" |
| `title` | string ≤80? |
| `body` | markdown ≤400 |

```json
{
  "type": "callout",
  "props": {
    "tone": "risk",
    "title": "No secret-file filter yet",
    "body": "The sandbox stops path escapes, not reads of .env inside the root."
  }
}
```

### `details`

One quiet 'more detail' disclosure: chevron plus underlined summary, content opens below with no surface. For evidence, never for the main point.

| Prop | Type |
|---|---|
| `summary` | string ≤80 |

Children: nodes

```json
{
  "type": "details",
  "props": {
    "summary": "Full request trace"
  },
  "children": [
    {
      "type": "prose",
      "props": {
        "content": "Evidence goes here."
      }
    }
  ]
}
```

### `ledger`

Rows of title + body grouped under a coloured label (risk, wait, new, done, none). Replaces status-grid and definition-list. Put what can break first. Colour lives on the group label only. Literal form: groups[]. Data-backed form: dataKey + titleKey + bodyKey + groupKey (+ nextKey, metaKey, groupOrder, signals).

| Prop | Type |
|---|---|
| `caption` | string? |
| `groups` | { label ≤40, signal?: "risk"\|"wait"\|"new"\|"done"\|"none", hint? ≤80, rows: { title ≤60, body: markdown ≤280, next? ≤140, meta? ≤40, href?: https }[] 1-12 }[] 1-4 |
| `dataKey` | string? — data-backed variant: data[dataKey] is an array of row objects |
| `titleKey` | string? — required with dataKey |
| `bodyKey` | string? — required with dataKey |
| `groupKey` | string? — required with dataKey; row value names its group |
| `nextKey` | string? |
| `metaKey` | string? |
| `groupOrder` | string[] ≤4? — group order; default is first-seen |
| `signals` | Record<group, signal>? — colour per group |

```json
{
  "type": "ledger",
  "props": {
    "groups": [
      {
        "label": "Can break something",
        "signal": "risk",
        "hint": "Fix these first.",
        "rows": [
          {
            "title": "Stale lockfile hash",
            "body": "Updating a git-pinned tool keeps the old hash.",
            "next": "Recompute on update."
          }
        ]
      },
      {
        "label": "Waiting on you",
        "signal": "wait",
        "rows": [
          {
            "title": "Work Mac check",
            "body": "Not applied since the pin bump."
          }
        ]
      }
    ]
  }
}
```

### `checklist`

One line per item with a state glyph: done, doing, todo, blocked, dropped. Replaces status chips and stepper-for-status.

| Prop | Type |
|---|---|
| `items` | { text ≤140, state: "done"\|"doing"\|"todo"\|"blocked"\|"dropped", note? ≤140 }[] 1-20 |

```json
{
  "type": "checklist",
  "props": {
    "items": [
      {
        "text": "Add the schemas",
        "state": "done"
      },
      {
        "text": "Register stubs",
        "state": "doing"
      },
      {
        "text": "Export the contract",
        "state": "todo"
      }
    ]
  }
}
```

### `figures`

An inline band of at most 4 big numbers with a label under each, optional note, sparkline and signal. No tiles. Replaces stat-card, metric and change-stats.

| Prop | Type |
|---|---|
| `items` | { value: string ≤24 \| number, label ≤40, note? ≤80, trend?: number[] 2-24, signal?: "new"\|"risk"\|"wait" }[] 1-4 |

```json
{
  "type": "figures",
  "props": {
    "items": [
      {
        "value": "114K",
        "label": "Typical input",
        "trend": [
          90,
          100,
          110,
          114
        ]
      },
      {
        "value": "200K",
        "label": "Model limit",
        "signal": "risk"
      }
    ]
  }
}
```

### `table`

Hairline table backed by embedded data. dense = smaller text, statusKey = dot plus word, highlightKey = boolean column that marks a row, onlyDiffs = hide columns where every row is the same. Absorbs data-table and comparison-table.

| Prop | Type |
|---|---|
| `dataKey` | string |
| `columns` | (string \| { key, label?, align?: left\|center\|right, width? })[]? |
| `caption` | string? |
| `dense` | boolean? |
| `statusKey` | string? |
| `highlightKey` | string? |
| `onlyDiffs` | boolean? |

```json
{
  "type": "table",
  "props": {
    "dataKey": "checks",
    "columns": [
      "check",
      "result",
      "evidence"
    ],
    "statusKey": "result",
    "onlyDiffs": true
  }
}
```

### `steps`

A step line of 2-7 steps with connectors. Mark 1-2 steps key (never all). Replaces flow and stepper. tag is a short mono label in the signal colour.

| Prop | Type |
|---|---|
| `caption` | string ≤240? |
| `items` | { title ≤40, body? ≤100, tag? ≤24, key?: boolean }[] 2-7 |
| `direction` | "row" \| "column"? |

```json
{
  "type": "steps",
  "props": {
    "items": [
      {
        "title": "Session grows",
        "body": "Context passes 70%."
      },
      {
        "title": "Memory saves first",
        "tag": "New order",
        "key": true
      },
      {
        "title": "Model summarises"
      }
    ]
  }
}
```

### `map`

A label-safe map of 2-6 nodes and at most 8 edges. Edges are terse: 'a -> b : label' (solid), 'a --> b' (dashed), '+ a -> b' (proposed). More than 6 nodes is an error: split into two maps or use steps. Caption is required.

| Prop | Type |
|---|---|
| `caption` | string ≤240 |
| `nodes` | { id, label ≤28, sub? ≤40, kind?: "actor"\|"service"\|"store"\|"file"\|"external", signal?: "new"\|"risk"\|"wait" }[] 2-6 |
| `edges` | string[] ≤8 |
| `layout` | "row" \| "column" \| "hub"? |
| `legend` | { solid?, dashed? }? |

```json
{
  "type": "map",
  "props": {
    "caption": "How a request reaches the store.",
    "nodes": [
      {
        "id": "web",
        "label": "Web",
        "kind": "actor"
      },
      {
        "id": "api",
        "label": "API",
        "kind": "service"
      },
      {
        "id": "db",
        "label": "Postgres",
        "kind": "store",
        "signal": "new"
      }
    ],
    "edges": [
      "web -> api : POST",
      "api -> db : write"
    ],
    "layout": "row"
  }
}
```

### `story`

A diagram that assembles as the reader scrolls: a map (up to 8 nodes) plus 2-7 beats, each showing nodes and optionally focusing some. Use one per page, for the core data flow.

| Prop | Type |
|---|---|
| `caption` | string ≤240 |
| `diagram` | { caption?, nodes (2-8, as map), edges ≤8, layout?, legend? } |
| `beats` | { text: markdown ≤320, show: id[], focus?: id[] }[] 2-7 |

```json
{
  "type": "story",
  "props": {
    "caption": "From a full session to a summary.",
    "diagram": {
      "nodes": [
        {
          "id": "session",
          "label": "Session"
        },
        {
          "id": "memory",
          "label": "Memory",
          "signal": "new"
        },
        {
          "id": "summary",
          "label": "Summary"
        }
      ],
      "edges": [
        "session -> memory : save facts",
        "memory -> summary : writes"
      ],
      "layout": "row"
    },
    "beats": [
      {
        "text": "The session fills up.",
        "show": [
          "session"
        ]
      },
      {
        "text": "Memory saves the facts first.",
        "show": [
          "session",
          "memory"
        ],
        "focus": [
          "memory"
        ]
      },
      {
        "text": "The summary is written from them.",
        "show": [
          "session",
          "memory",
          "summary"
        ],
        "focus": [
          "summary"
        ]
      }
    ]
  }
}
```

### `sequence`

Lifeline sequence diagram, at most 10 steps (split bigger ones). Same terse steps as sequence-diagram: 'a -> b : text', 'a --> b', 'a -x-> b', 'note over a, b: text', '--- label ---'. key lists 0-based step indices to emphasise. caption is required.

| Prop | Type |
|---|---|
| `title` | string? |
| `caption` | string |
| `participants` | { id, label? ≤28, kind?: "actor"\|"service"\|"store"\|"external", mark? }[] 2-8 |
| `steps` | (string \| object)[] 1-10 |
| `key` | number[]? — step indices to emphasise |

```json
{
  "type": "sequence",
  "props": {
    "caption": "Cancel wins only before the worker claims the row.",
    "participants": [
      {
        "id": "user",
        "kind": "actor"
      },
      {
        "id": "api"
      },
      {
        "id": "db",
        "kind": "store"
      }
    ],
    "steps": [
      "user -> api : cancel",
      "api -> db : update status",
      "db --> api : 1 row",
      "api --> user : 204"
    ],
    "key": [
      1
    ]
  }
}
```

### `timeline`

A vertical spine with dated ticks, no cards. Literal form: items[] of 2-12. Data-backed form: dataKey with whenKey/titleKey/bodyKey/signalKey (the old markerKey, descriptionKey and statusKey still work).

| Prop | Type |
|---|---|
| `items` | { when ≤24, title ≤60, body? ≤200, signal?: "new"\|"risk"\|"wait" }[] 2-12 |
| `caption` | string? |
| `dataKey` | string? — data-backed variant |
| `whenKey` | string? |
| `titleKey` | string? |
| `bodyKey` | string? |
| `signalKey` | string? |
| `markerKey` | string? — v1 alias of whenKey |
| `descriptionKey` | string? — v1 alias of bodyKey |
| `statusKey` | string? — v1 alias of signalKey |

```json
{
  "type": "timeline",
  "props": {
    "items": [
      {
        "when": "Oct 4",
        "title": "Pi 1.0.4 live"
      },
      {
        "when": "Oct 7",
        "title": "Tool cards ship",
        "signal": "new"
      },
      {
        "when": "Oct 9",
        "title": "Cloud agents land"
      }
    ]
  }
}
```

### `compare`

Before/after or option comparison: two labelled columns with a vertical rule, no boxes. With rows, only differing rows render; identical rows collapse to one muted line. verdict renders as the takeaway.

| Prop | Type |
|---|---|
| `mode` | "before-after" \| "options" |
| `left` | { label ≤40, body: markdown ≤600 } |
| `right` | { label ≤40, body: markdown ≤600 } |
| `rows` | { aspect ≤40, left ≤120, right ≤120 }[] ≤10? |
| `verdict` | string ≤160? |

```json
{
  "type": "compare",
  "props": {
    "mode": "before-after",
    "left": {
      "label": "Before",
      "body": "Two writers, one file."
    },
    "right": {
      "label": "After",
      "body": "One owner per file."
    },
    "rows": [
      {
        "aspect": "Conflicts",
        "left": "Last write wins",
        "right": "Cannot happen"
      }
    ],
    "verdict": "One owner per file."
  }
}
```

### `decision`

A question for the reader; options render as rows (radio ring, label, consequence), exactly one suggested option for single choice. Answers are local page state; one "Copy decisions as Markdown" button exports them. Max 5 per spec; ids unique.

| Prop | Type |
|---|---|
| `id` | PlanId |
| `question` | string ≤200 |
| `mode` | "single" \| "multiple"? |
| `options` | { id, label ≤80, consequence? ≤100, suggested? }[] 2-6 |
| `allowOther` | boolean? |

```json
{
  "type": "decision",
  "props": {
    "id": "limit",
    "question": "How many scheduled messages per user?",
    "options": [
      {
        "id": "fifty",
        "label": "50",
        "suggested": true
      },
      {
        "id": "five-hundred",
        "label": "500"
      },
      {
        "id": "none",
        "label": "No limit",
        "consequence": "risk of abuse"
      }
    ]
  }
}
```

### `code`

Syntax-highlighted code (props identical to code-block; code-block, diff and log are aliases or legacy). Flat surface, title above as mono caps. Use for commands, config, env contracts. Set diff: true for +/- lines.

| Prop | Type |
|---|---|
| `title` | string? |
| `language` | string? |
| `code` | string |
| `caption` | string? |
| `lineNumbers` | boolean? |
| `startLine` | number? |
| `highlight` | (number \| "a-b")[]? |
| `annotations` | { line, title ≤80, body? ≤280, tone? }[]? — max 12 |
| `diff` | boolean? — lines start with "+ ", "- ", "  " or "@@" |
| `sketch` | boolean? |
| `src` | "path:12-30"? — create inlines the range |

```json
{
  "type": "code",
  "props": {
    "title": "Smoke release",
    "language": "bash",
    "code": "pnpm export:contract\npnpm verify:artifacts"
  }
}
```

### `trend`

Bare line or bar chart backed by embedded data. Up to 3 series labelled directly at their ends, no legend box. mark adds up to 3 annotated vertical hairlines. caption is required.

| Prop | Type |
|---|---|
| `dataKey` | string |
| `x` | string |
| `y` | string \| string[] ≤3 |
| `kind` | "line" \| "bar"? |
| `caption` | string ≤240 |
| `mark` | { x: string\|number, label ≤60 }[] ≤3? |

```json
{
  "type": "trend",
  "props": {
    "dataKey": "inputSizes",
    "x": "week",
    "y": "tokens",
    "caption": "Input size by week.",
    "mark": [
      {
        "x": "W3",
        "label": "Haiku switch"
      }
    ]
  }
}
```

### `quote`

One pull-quote in serif italic with an optional source line (from, via, date, href). A list of quotes is a ledger with meta.

| Prop | Type |
|---|---|
| `text` | string ≤400 |
| `from` | string ≤60? |
| `via` | "prompt"\|"slack"\|"github"\|"doc"\|"email"\|"meeting"\|"transcript"? |
| `date` | YYYY-MM-DD? |
| `href` | https url? |

```json
{
  "type": "quote",
  "props": {
    "text": "Users keep asking to send later.",
    "via": "slack",
    "from": "Dana",
    "date": "2026-09-30"
  }
}
```

### `links`

A plain inline row of underlined links (sources, references). Hrefs: http, https, mailto, tel or relative.

| Prop | Type |
|---|---|
| `items` | { label ≤60, href }[] 1-8 |

```json
{
  "type": "links",
  "props": {
    "items": [
      {
        "label": "Design review",
        "href": "https://example.com/review"
      },
      {
        "label": "Plan",
        "href": "https://example.com/plan"
      }
    ]
  }
}
```

## Specialised nodes

Use these when the content needs the exhibit. Plans use `claim-tree` with `claim` children.

### `claim-tree`

Plan spine: numbered, collapsible claims with a contents rail. Children must be claim nodes. At most one per spec. open: "needs" opens claims that hold a decision.

| Prop | Type |
|---|---|
| `title` | string? |
| `open` | "all" \| 1 \| 2 \| "needs"? |
| `contents` | boolean? — side contents rail (default true) |

Children: nodes

```json
{
  "type": "claim-tree",
  "props": {
    "open": "needs"
  },
  "children": [
    {
      "type": "claim",
      "props": {
        "text": "The user can pick a time in the composer."
      },
      "children": [
        {
          "type": "text",
          "props": {
            "text": "Exhibit goes first."
          }
        }
      ]
    }
  ]
}
```

### `claim`

One numbered plan claim inside a claim-tree or claim (max 3 levels). Children order: one exhibit, then at most one decision or alert, then child claims. aux "shared" renders ✱, "scope" renders –. ref links to a call-stack row id.

| Prop | Type |
|---|---|
| `text` | string ≤280 |
| `aux` | "shared" \| "scope"? |
| `ref` | call-stack row id? |
| `open` | boolean? |

Children: nodes

```json
{
  "type": "claim",
  "props": {
    "text": "A worker claims due messages once a minute."
  },
  "children": [
    {
      "type": "text",
      "props": {
        "text": "Exhibit."
      }
    }
  ]
}
```

### `call-stack`

Annotated call stack. Terse rows: column 0 is a mark (+ added, - removed, ~ changed, ? proposed, space context), column 1 a space, the call from column 2; indent 2 spaces per depth. End with " @ path/file.ts:12" and " -- note". Use **bold** for the focus call. Object rows add id, kind and an inline excerpt shown on click.

| Prop | Type |
|---|---|
| `title` | string? |
| `caption` | string? |
| `rows` | (string \| { call, depth, mark?, at?, note?, kind?: "call"\|"ui"\|"net"\|"cond"\|"io"\|"gap", id?, excerpt?: { code, language?, startLine? } })[] ≤60 |
| `repo` | { name, ref?, baseUrl? (https) }? — links locations |
| `initialRow` | number? |

```json
{
  "type": "call-stack",
  "props": {
    "title": "The list",
    "rows": [
      "~ <Sidebar/> @ web/src/nav/Sidebar.tsx:30",
      "+   <ScheduledFolder/> @ web/src/scheduled/ScheduledFolder.tsx:14",
      "+     GET /api/scheduled @ web/src/api/scheduled.ts:21"
    ]
  }
}
```

### `state-machine`

Clickable state machine. Events are terse "from -event-> to : label" (event ids are kebab-case). Optional grid places states; traces replay event paths. Screen children (with metadata.id) are shown when a state with screen = that id is selected.

| Prop | Type |
|---|---|
| `title` | string? |
| `caption` | string? |
| `initial` | state id |
| `states` | { id, label?, description?, final?, mark?, screen?, code?, sets? }[] 2-16 |
| `events` | (string \| { from, event, to, label?, mark? })[] |
| `grid` | ("\| a \| b \| . \|" \| (id \| null)[])[]? |
| `traces` | { name, events: event[] }[]? |

Children: nodes

```json
{
  "type": "state-machine",
  "props": {
    "initial": "scheduled",
    "states": [
      {
        "id": "scheduled"
      },
      {
        "id": "sending"
      },
      {
        "id": "sent",
        "final": true
      },
      {
        "id": "failed",
        "final": true
      }
    ],
    "events": [
      "scheduled -at-send-at-> sending : at send_at",
      "sending -ok-> sent",
      "+ sending -error-> failed"
    ],
    "grid": [
      "| scheduled | sending | sent |",
      "| . | failed | . |"
    ]
  }
}
```

### `mockup`

Framed UI mockup built from child nodes (wireframe, text, badge, button, code-block…). Pins point at a child metadata.id or at x/y fractions. No claims, decisions, mockups or state-machines inside.

| Prop | Type |
|---|---|
| `frame` | "none" \| "browser" \| "phone" \| "desktop" \| "terminal" |
| `width` | number? 280-1440 |
| `label` | string? — URL bar or window title |
| `caption` | string? |
| `pins` | { n?, target?: metadata.id, x?, y?, text ≤140 }[]? ≤12 |

Children: nodes

```json
{
  "type": "mockup",
  "props": {
    "frame": "terminal",
    "label": "zsh"
  },
  "children": [
    {
      "type": "wireframe",
      "props": {
        "element": "prompt",
        "text": "visual-artifact create plan.json"
      }
    },
    {
      "type": "wireframe",
      "props": {
        "element": "output",
        "text": "✓ created"
      }
    }
  ]
}
```

### `wireframe`

Low-fidelity UI primitive, only inside a mockup. prompt/output need a terminal frame.

| Prop | Type |
|---|---|
| `element` | "navbar"\|"sidebar"\|"input"\|"textarea"\|"select"\|"toggle"\|"checkbox"\|"avatar"\|"placeholder"\|"skeleton-lines"\|"toast"\|"modal-scrim"\|"divider"\|"prompt"\|"output"\|"spinner" |
| `text` | string? |
| `items` | string[]? ≤8 |
| `lines` | number? 1-8 |
| `state` | "default"\|"active"\|"disabled"\|"error"\|"checked"? |
| `mark` | ChangeMark? |

```json
{
  "type": "wireframe",
  "props": {
    "element": "navbar",
    "items": [
      "Inbox",
      "Scheduled"
    ]
  }
}
```

### `execution-trace`

Source-backed call stack for planning or reviewing code changes, especially API surfaces: interfaces, types, transformations, and boundaries. JavaScript-family and Ruby adapters normalize ast-grep facts into one shared trace contract. Select ordered file spans, run `visual-artifact trace inspect` for canonical focus/scope facts, then add narrative context. Create-time verification rejects stale or edited code identity.

| Prop | Type |
|---|---|
| `title` | string? |
| `caption` | string? |
| `provenance` | { mode: 'captured' \| 'inferred' \| 'simulated' \| 'mixed', method: 'runtime-probe' \| 'inspector' \| 'static-analysis' \| 'author-curated', summary: string, confidence: 'high' \| 'medium' \| 'low', codeRevision?: string } |
| `events` | ExecutionTraceEvent[] (1-100; every event requires source: { src, facts } copied from `visual-artifact trace inspect`; the CLI re-extracts facts and persists { content, facts }; boundary events require boundary.from/to/kind/outcome; values require typed preview + provenance; optional impacts are { kind: 'effect' \| 'error', title, description?, codeRef? }[] and should be omitted unless evidence establishes them) |
| `typeDefinitions` | { name: string, definition: string, language?: string, file?: string, line?: number, provenance: 'inferred' \| 'derived' }[]? (main domain types referenced by staticType; names must be unique) |
| `initialEventId` | string? (select the most review-relevant event on load without changing execution order) |
| `showCallStack` | boolean? |

```json
{
  "type": "execution-trace",
  "props": {
    "title": "Artifact validation boundary",
    "provenance": {
      "mode": "inferred",
      "method": "static-analysis",
      "summary": "Types and control flow derived from the reviewed source.",
      "confidence": "high"
    },
    "events": [
      {
        "id": "validate-spec",
        "order": 0,
        "phase": "validate",
        "kind": "boundary",
        "label": "Validate artifact JSON",
        "source": {
          "src": "shared/src/artifact-schema.ts",
          "facts": {
            "span": {
              "file": "shared/src/artifact-schema.ts",
              "startLine": 1610,
              "endLine": 1610
            },
            "excerpt": "  return VisualArtifactSpecSchema.safeParse(value)",
            "sourceHash": "04490e3be59080179353fa997da4035cab6e64337bc18e8a4aef2914d1ddc6f6",
            "revision": "c8313cafef237497e233c2e5aa2072875b1a613a",
            "worktree": "dirty",
            "language": "typescript",
            "syntaxKind": "call_expression",
            "focus": {
              "kind": "call",
              "text": "VisualArtifactSpecSchema.safeParse(value)",
              "symbol": "VisualArtifactSpecSchema.safeParse"
            },
            "scope": {
              "kind": "function",
              "symbol": "safeParseVisualArtifactSpec",
              "startLine": 1605,
              "endLine": 1611
            },
            "resolution": "resolved"
          }
        },
        "boundary": {
          "kind": "validation",
          "from": {
            "label": "Parsed JSON",
            "system": "runtime"
          },
          "to": {
            "label": "Renderer contract",
            "system": "renderer"
          },
          "outcome": "passed"
        },
        "inputs": [
          {
            "id": "raw",
            "name": "data",
            "staticType": "unknown",
            "runtimeType": "object",
            "preview": {
              "kind": "object",
              "text": "{ slug, nodes, data }"
            },
            "provenance": "inferred"
          }
        ],
        "outputs": [
          {
            "id": "spec",
            "name": "spec",
            "staticType": "VisualArtifactSpec",
            "runtimeType": "object",
            "preview": {
              "kind": "object",
              "text": "validated artifact spec"
            },
            "provenance": "inferred"
          }
        ],
        "transformation": {
          "summary": "Untrusted JSON becomes a validated renderer contract.",
          "mappings": [
            {
              "from": "data",
              "to": "spec",
              "operation": "validate"
            }
          ]
        },
        "impacts": [
          {
            "kind": "error",
            "title": "Rejects invalid artifact data",
            "description": "Validation failure prevents the renderer from accepting the external value.",
            "codeRef": {
              "file": "shared/src/artifact-schema.ts",
              "line": 1610
            }
          }
        ],
        "evidence": {
          "origin": "inferred",
          "confidence": "high"
        }
      }
    ]
  }
}
```

### `file-tree`

A collapsible file explorer tree. Defaults to the enhanced look: empty dirs are flattened, file-type icons (iconSet=standard), default density. Add gitStatus for status badges (rows auto-align), searchable for a filter box. File items may carry `content` + `language` (tapping renders a code-block below the tree) or `src` (a repo-relative or absolute path that `visual-artifact create` reads and inlines into `content` at save time).

| Prop | Type |
|---|---|
| `items` | { name: string, type?: "file" \| "directory", children?: file-tree[], content?: string, language?: string, src?: string }[] |
| `flattenEmpty` | boolean? |
| `searchable` | boolean? |
| `gitStatus` | Record<string, GitStatus>? |
| `density` | "compact" \| "default" \| "relaxed"? |
| `iconSet` | "minimal" \| "standard" \| "complete"? |
| `defaultExpanded` | boolean? |
| `notes` | Record<path, string ≤80>? — right-aligned # note; keys are full slash-joined paths like gitStatus keys |
| `statusStyle` | "letters" \| "marks"? — marks shows + ~ − and strikes deleted names; plans use marks |

```json
{
  "type": "file-tree",
  "props": {
    "items": [
      {
        "name": "src",
        "type": "directory",
        "children": [
          {
            "name": "index.ts",
            "type": "file"
          }
        ]
      }
    ],
    "flattenEmpty": true,
    "searchable": true
  }
}
```

### `image`

An image with optional caption, aspect ratio, and click-to-zoom modal. Place sidecar image files next to the artifact JSON under ~/.pi/artifacts/<project>/ and use a relative path like "hero.png". Use absolute HTTPS URLs for external images. Never use file:// URLs.

| Prop | Type |
|---|---|
| `src` | string |
| `alt` | string |
| `caption` | string? |
| `aspect` | "auto" \| "square" \| "video" \| "wide"? |
| `zoom` | boolean? |

```json
{
  "type": "image",
  "props": {
    "src": "hero.png",
    "alt": "Placeholder",
    "zoom": true
  }
}
```

### `mermaid`

Client-rendered zoomable/pannable Mermaid diagram with wheel, pinch, drag, keyboard, and fit controls. Provide a required caption that describes the diagram. Use for quick architecture, sequence, flowchart, ERD, state, class, and C4 diagrams from Mermaid text.

| Prop | Type |
|---|---|
| `code` | string |
| `caption` | string |
| `height` | integer? 240-1600 |

```json
{
  "type": "mermaid",
  "props": {
    "caption": "Request flow",
    "code": "flowchart LR\n  Client --> API\n  API --> DB"
  }
}
```

### `svg-diagram`

Full-screen interactive SVG/HTML architecture diagram embedded in a sandboxed iframe. Use when Mermaid cannot lay out the topology cleanly, when you need animated request paths, clickable nodes, or precise visual control. The html value must be a complete self-contained document with hand-rolled CSS variables for light/dark themes, an apply-before-paint theme script, a theme toggle, and an SVG styled through CSS classes (no hard-coded hex inside SVG). Layout rules: pick a viewBox large enough for all nodes; keep at least 30px between node rectangles and 40px between zones; reserve the bottom-right corner for the detail card overlay; route edges and labels through empty space; verify by inspection that nothing overlaps.

| Prop | Type |
|---|---|
| `html` | string |
| `title` | string? |
| `caption` | string? |
| `height` | integer? 240-1600 |

```json
{
  "type": "svg-diagram",
  "props": {
    "title": "Interactive architecture",
    "height": 720,
    "html": "<!doctype html><html><head><script>(function(){try{const k='visualizer-theme',s=localStorage.getItem(k),d=s?s==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}})();</script><style>:root{--bg:#FAF9F5;--ink:#141413;}html.dark{--bg:#141413;--ink:#FAF9F5;}body{background:var(--bg);}</style></head><body><svg viewBox='0 0 100 40'><text x='5' y='24' fill='var(--ink)'>Architecture</text></svg></body></html>"
  }
}
```

## Legacy types: do not use

These types still parse so stored artifacts keep rendering. Do not write new ones.

| Legacy type | Use instead |
|---|---|
| `alert` | use callout: Use callout (tone: note, risk, new, wait). |
| `definition-list` | use ledger: Term on the left, text on the right is a ledger row. |
| `diff` | use code: Use code with diff: true and lines starting '+ ', '- ', '  '. |
| `donut-chart` | use figures: Donut charts mislead. Use figures or table. |
| `area-chart` | use trend: Use trend. |
| `radar-chart` | use table: Radar charts mislead. Use table or compare. |
| `scatter-chart` | use trend: Use trend, or table when exact values matter. |
| `heatmap` | use table: Use table with highlightKey. |
| `log` | use code: Use code with language 'log'. |
| `pie-chart` | use figures: Pie charts mislead. Use figures or table. |
| `stepper` | use steps: Use steps (or checklist for status). |
| `heading` | use chapter: Use chapter (kicker, title, deck, takeaway) instead of free headings. |
| `text` | use prose: Use prose for paragraphs; chapter carries the headings. |
| `card` | use columns: No boxes. Use columns for text side by side, or chapter + prose. |
| `metric` | use figures: Use figures. |
| `stat-card` | use figures: Use figures: an inline band of at most 4 numbers, no tiles. |
| `badge` | use ledger: Status is a dot plus a word inside ledger or checklist rows. |
| `button` | use links: Use links for a plain row of underlined links. |
| `separator` | use chapter: Chapters draw their own rule. |
| `data-table` | use table: Use table with dense: true. |
| `comparison-table` | use table: Use table with statusKey (and onlyDiffs). |
| `chart` | use trend: Use trend: bare line or bar with direct labels. |
| `flow` | use steps: Use steps: a step line with 1-2 key steps. |
| `code-block` | use code: Alias: same props as code; prefer the new name. |
| `sequence-diagram` | use sequence: Alias: same props as sequence; prefer the new name. |
| `box-diagram` | use map: Use map: 2-6 nodes, label-safe edges. Split bigger diagrams. |
| `change-stats` | use figures: Use figures. |
| `quotes` | use quote: Use quote for one pull-quote, or ledger rows with meta for a list. |
| `status-grid` | use ledger: Use ledger: groups by status, risk first; data-backed via groupKey. |
| `grid` | use columns: Grids of cards are the anti-pattern. Use columns for text, figures for numbers. |
| `section` | use chapter: Use chapter: it adds a kicker, deck and takeaway. |
| `tabs` | use compare: Tabs hide content. Use compare or ledger groups. |
| `accordion` | use details: Use details for one quiet 'more detail' disclosure. |

## Notes

- `dataKey` variants (`ledger`, `table`, `timeline`, `figures`) read rows from the top-level `data` object, so tabular content stays out of the node tree.
- `decision` ids are unique per page.
- Limits come from `contract.limits`.
