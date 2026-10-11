// Shared, dependency-free source of truth for the visual artifact contract.
// Used by the Next.js renderer export script and by the compiled CLI.

import {
  ARTIFACT_SLUG_MAX_LENGTH,
  ARTIFACT_SPEC_RESOURCE_LIMITS,
  ARTIFACT_TYPES,
  EXECUTION_TRACE_SOURCE_LANGUAGES,
  MAX_TOP_LEVEL_NODES,
  type ArtifactSpecResourceLimits,
  type ExecutionTraceSourceLanguage,
} from "./artifact-schema.js"

export {
  ARTIFACT_SLUG_MAX_LENGTH,
  ARTIFACT_SPEC_RESOURCE_LIMITS,
  ARTIFACT_TYPES,
  EXECUTION_TRACE_SOURCE_LANGUAGES,
  ArtifactNodeSchema,
  ArtifactTypeSchema,
  ArtifactResourceError,
  ArtifactSizeError,
  ArtifactSlugSchema,
  ArtifactValidationError,
  MAX_AGGREGATE_FILE_SOURCE_BYTES,
  MAX_DATASETS,
  MAX_FILE_SOURCE_BYTES,
  MAX_FILE_TREE_DEPTH,
  MAX_FILE_TREE_ITEMS,
  MAX_NODE_DEPTH,
  MAX_TOP_LEVEL_NODES,
  MAX_TOTAL_NODES,
  RAW_ARTIFACT_MAX_BYTES,
  VisualArtifactSpecSchema,
  parseRawArtifactJson,
  parseVisualArtifactSpec,
  preflightArtifactSpec,
  safeParseVisualArtifactSpec,
  type ArtifactColumn,
  type ArtifactFlowItem,
  type ArtifactNode,
  type ArtifactPreflightResult,
  type ArtifactSpecResourceLimits,
  type ArtifactTone,
  type ArtifactType,
  type ExecutionTraceBoundary,
  type ExecutionTraceBoundaryKind,
  type ExecutionTraceEvent,
  type ExecutionTraceEvidence,
  type ExecutionTraceImpact,
  type ExecutionTraceMapping,
  type ExecutionTracePhase,
  type ExecutionTraceProvenance,
  type ExecutionTraceProvenanceOrigin,
  type ExecutionTraceSourceContext,
  type ExecutionTraceSourceFacts,
  type ExecutionTraceSourceFocus,
  type ExecutionTraceSourceFocusKind,
  type ExecutionTraceSourceScope,
  type ExecutionTraceSourceScopeKind,
  type ExecutionTraceSourceLanguage,
  type ExecutionTraceSourceSpan,
  type ExecutionTraceSystemRef,
  type ExecutionTraceTypeDefinition,
  type ExecutionTraceTypedValue,
  type ExecutionTraceValueField,
  type VisualArtifactSpec,
} from "./artifact-schema.js"

export {
  checkGrid,
  parseGridRows,
  parseMarkPrefix,
  type GridCells,
  type MarkPrefix,
  type TerseError,
} from "./terse/common.js"
export * from "./plan-primitives.js"
export * from "./plan-schemas.js"
export * from "./editorial-schemas.js"
export * from "./terse/call-stack.js"
export * from "./terse/sequence.js"
export * from "./terse/edges.js"
export * from "./terse/machine.js"

export const ARTIFACT_SPEC_CONSTRAINTS = {
  slug: {
    type: "string",
    format: "kebab-case",
    minLength: 1,
    maxLength: ARTIFACT_SLUG_MAX_LENGTH,
  },
  title: {
    type: "string",
    minLength: 1,
  },
  description: {
    type: "string",
    minLength: 1,
    optional: true,
  },
  createdAt: {
    type: "string",
    minLength: 1,
    optional: true,
  },
  artifactType: {
    enum: ARTIFACT_TYPES,
    optional: true,
  },
  topics: {
    type: "array",
    items: "non-empty string",
    optional: true,
  },
  layout: {
    type: {
      enum: ["default", "grid"] as const,
    },
    columns: {
      enum: [1, 2, 3, 4] as const,
    },
  },
  nodes: {
    type: "array",
    minItems: 1,
    maxItems: MAX_TOP_LEVEL_NODES,
  },
} as const

/** The 18 core editorial nodes. Agents are pointed at these first. */
export const CORE_NODE_TYPES = [
  "chapter",
  "prose",
  "columns",
  "callout",
  "details",
  "ledger",
  "checklist",
  "figures",
  "table",
  "steps",
  "map",
  "story",
  "sequence",
  "timeline",
  "compare",
  "decision",
  "code",
  "trend",
] as const satisfies readonly string[]

/** Specialised nodes: still in the contract, used only when the job needs them. */
export const SPECIALISED_NODE_TYPES = [
  "claim-tree",
  "claim",
  "call-stack",
  "state-machine",
  "mockup",
  "wireframe",
  "execution-trace",
  "file-tree",
  "image",
  "mermaid",
  "svg-diagram",
  "links",
  "quote",
] as const satisfies readonly string[]

/** Node types the agent contract advertises. */
export const ARTIFACT_NODE_TYPES = [
  ...CORE_NODE_TYPES,
  ...SPECIALISED_NODE_TYPES,
] as const satisfies readonly string[]

/**
 * Node types that still parse and render (stored artifacts keep working) but are
 * hidden from the agent contract. Each carries `legacy: { replacedBy, hint }` in the manifest.
 */
export const LEGACY_NODE_TYPES = [
  "text",
  "heading",
  "section",
  "card",
  "grid",
  "tabs",
  "accordion",
  "stat-card",
  "metric",
  "badge",
  "button",
  "separator",
  "alert",
  "status-grid",
  "comparison-table",
  "data-table",
  "definition-list",
  "flow",
  "stepper",
  "box-diagram",
  "sequence-diagram",
  "code-block",
  "diff",
  "log",
  "chart",
  "area-chart",
  "radar-chart",
  "scatter-chart",
  "pie-chart",
  "donut-chart",
  "heatmap",
  "change-stats",
  "quotes",
] as const satisfies readonly string[]

export type ArtifactCoreNodeType = (typeof ARTIFACT_NODE_TYPES)[number]
export type LegacyNodeType = (typeof LEGACY_NODE_TYPES)[number]
export type ArtifactNodeType = ArtifactCoreNodeType | LegacyNodeType

export const CONTRACT_VERSION = "2.0.0"

export interface NodeDef {
  description: string
  props: Record<string, string>
  children: false | "nodes" | "items"
  data?: string
  requiresData?: boolean
  example: unknown
}

export interface LegacyInfo {
  replacedBy: string
  hint: string
}

export interface ArtifactManifestEntry extends NodeDef {
  type: ArtifactNodeType
  /** Set on legacy node types: still parses and renders, hidden from the contract. */
  legacy?: LegacyInfo
}

export const artifactPatternExamples = {
  "weekly-report": {
    description: "Weekly report: one chapter per theme (kicker, deck, one main exhibit, plus at most one supporting prose, details or callout, takeaway), then open loops as a ledger grouped by what can break and what waits on someone.",
    nodes: [
      {
        type: "chapter",
        props: { kicker: "Memory", title: "Long sessions keep their facts", deck: "Facts are saved before the model summarises, so a long session no longer forgets decisions.", takeaway: "Save first, summarise second." },
        children: [
          {
            type: "steps",
            props: {
              caption: "What happens when a session grows",
              items: [
                { title: "Session grows", body: "Context passes 70%." },
                { title: "Memory saves first", body: "Decisions and open loops are written down.", tag: "New order", key: true },
                { title: "Model summarises" },
                { title: "Next session", body: "Reads the saved facts.", key: true },
              ],
            },
          },
        ],
      },
      {
        type: "ledger",
        props: {
          groups: [
            { label: "Can break something", signal: "risk", hint: "Fix these first.", rows: [{ title: "Stale lockfile hash", body: "Updating a git-pinned tool keeps the old hash, so the next apply fails.", next: "Recompute the hash on update." }] },
            { label: "Waiting on you", signal: "wait", rows: [{ title: "Work Mac check", body: "The work profile has not been applied since the pin bump.", next: "Run apply on the work Mac." }] },
          ],
        },
      },
    ],
  },
  explainer: {
    description: "Design explainer: a chapter with one story (diagram that assembles as the reader scrolls), figures with few numbers, and one risk callout.",
    nodes: [
      {
        type: "chapter",
        props: { kicker: "Design", title: "How compaction works", deck: "A small model writes the summary, and memory is saved before it runs.", takeaway: "The summary is only as good as the facts saved before it." },
        children: [
          {
            type: "story",
            props: {
              caption: "From a full session to a summary",
              diagram: {
                nodes: [
                  { id: "session", label: "Session", kind: "actor" },
                  { id: "memory", label: "Memory", kind: "store", signal: "new" },
                  { id: "model", label: "Compaction model", kind: "service" },
                  { id: "summary", label: "Summary", kind: "file" },
                ],
                edges: ["session -> memory : save facts", "memory -> model : facts + transcript", "model -> summary : writes"],
                layout: "row",
              },
              beats: [
                { text: "The session fills up and hits the compaction limit.", show: ["session"] },
                { text: "Memory saves the facts first.", show: ["session", "memory"], focus: ["memory"] },
                { text: "A small model reads the facts and the transcript, then writes the summary.", show: ["session", "memory", "model", "summary"], focus: ["model", "summary"] },
              ],
            },
          },
          { type: "figures", props: { items: [{ value: "114K", label: "Typical input" }, { value: "167K", label: "Largest input" }, { value: "200K", label: "Model limit", signal: "risk" }] } },
          { type: "callout", props: { tone: "risk", title: "Haiku may not run today", body: "If the usage cap is hit, compaction falls back to the main model." } },
        ],
      },
    ],
  },
  plan: {
    description: "Implementation plan: chapter per phase, a checklist of work, a code excerpt, and open questions as decisions.",
    nodes: [
      {
        type: "chapter",
        props: { kicker: "Phase 1", title: "Ship the schema", deck: "Contract first, so every worker builds against the same shapes.", takeaway: "Nothing else starts until the contract passes." },
        children: [
          {
            type: "checklist",
            props: {
              items: [
                { text: "Add the new node schemas", state: "done" },
                { text: "Register stub adapters", state: "doing" },
                { text: "Export the contract", state: "todo" },
                { text: "Migrate stored artifacts", state: "dropped", note: "Old specs keep parsing." },
              ],
            },
          },
          { type: "code", props: { title: "Check", language: "bash", code: "pnpm export:contract\npnpm verify:artifacts" } },
          {
            type: "decision",
            props: {
              id: "alias",
              question: "Keep the old node names as aliases?",
              options: [
                { id: "keep", label: "Keep them", consequence: "Old specs render unchanged.", suggested: true },
                { id: "drop", label: "Drop them", consequence: "Stored artifacts break." },
              ],
            },
          },
        ],
      },
    ],
  },
  decision: {
    description: "Decision record: context in prose, the options side by side in compare (only differing rows render), the verdict as the takeaway.",
    nodes: [
      {
        type: "chapter",
        props: { kicker: "Decision", title: "Where the config lives", deck: "Two tools wrote the same file and overwrote each other.", takeaway: "One owner per file." },
        children: [
          { type: "prose", props: { content: "**Problem:** both tools rewrote the file on every apply, so one change always lost." } },
          {
            type: "compare",
            props: {
              mode: "options",
              left: { label: "Shared merge", body: "Both tools write one file through a merge step." },
              right: { label: "Split files", body: "Each tool owns its own file." },
              rows: [
                { aspect: "Conflicts", left: "Merge rules decide", right: "Cannot happen" },
                { aspect: "Setup", left: "One file", right: "Two files and an include" },
              ],
              verdict: "Split files: nothing to merge, nothing to lose.",
            },
          },
        ],
      },
    ],
  },
  "status-board": {
    description: "Status or open-loops board: a figures band (at most 4 numbers), a ledger grouped by status with blocked first, and detail tucked into details.",
    nodes: [
      { type: "figures", props: { items: [{ value: 119, label: "Tools" }, { value: 7, label: "Done", signal: "new" }, { value: 3, label: "Blocked", signal: "risk" }] } },
      {
        type: "ledger",
        props: {
          groups: [
            { label: "Blocked", signal: "risk", rows: [{ title: "Edit cards", body: "Diffs are cut off at the edge.", next: "Wrap long lines." }] },
            { label: "In review", signal: "wait", rows: [{ title: "Cursor cards", body: "Waiting for a second pair of eyes." }] },
            { label: "Done", signal: "done", rows: [{ title: "Time divider", body: "Shows at most every ten minutes." }] },
          ],
        },
      },
      { type: "details", props: { summary: "Full inventory" }, children: [{ type: "prose", props: { content: "The full list lives in the inventory folder." } }] },
    ],
  },
}

export const artifactManifest = {
  "alert": {
    type: "alert",
    legacy: { replacedBy: "callout", hint: "Use callout (tone: note, risk, new, wait)." },
    description: "An alert message to call out important information.",
    props: { title: "string", description: "string?", variant: '"default" | "destructive"?', tone: '"info" | "warn" | "risk" | "ok" | "idea"? — callout tone; wins over variant (destructive = risk)' },
    children: false,
    example: { type: "alert", props: { title: "No secret-file filter yet", description: "The sandbox stops path escapes, not reads of .env inside the root.", tone: "risk" } },
  },
  "definition-list": {
    type: "definition-list",
    legacy: { replacedBy: "ledger", hint: "Term on the left, text on the right is a ledger row." },
    description: "A compact list of terms and descriptions.",
    props: { items: "{ term: string, description: string }[]" },
    children: false,
    example: { type: "definition-list", props: { items: [{ term: "Term", description: "Description" }] } },
  },
  "diff": {
    type: "diff",
    legacy: { replacedBy: "code", hint: "Use code with diff: true and lines starting '+ ', '- ', '  '." },
    description: "Code or text difference visualization. Accepts either a raw unified diff string (content) or a before/after pair.",
    props: { before: "string?", after: "string?", content: "string?", language: "string?", title: "string?", defaultOpen: "boolean?", mode: '"unified" | "split"?', showLineNumbers: "boolean?", indicators: '"bars" | "plus-minus" | "none"?', highlightInline: "boolean?", hunkSeparator: '"default" | "custom"?', caption: "string?" },
    children: false,
    example: { type: "diff", props: { content: "diff --git a/index.ts b/index.ts\n--- a/index.ts\n+++ b/index.ts\n@@ -1,3 +1,3 @@\n- old\n+ new\n", language: "typescript", title: "Sample diff" } },
  },
  "donut-chart": {
    type: "donut-chart",
    legacy: { replacedBy: "figures", hint: "Donut charts mislead. Use figures or table." },
    description: "A donut chart for proportional data.",
    props: { dataKey: "string", categoryKey: "string", valueKey: "string" },
    children: false,
    requiresData: true,
    example: { type: "donut-chart", props: { dataKey: "browserStats", categoryKey: "browser", valueKey: "visitors" } },
  },
  "area-chart": {
    type: "area-chart",
    legacy: { replacedBy: "trend", hint: "Use trend." },
    description: "An area chart for cumulative trends.",
    props: { dataKey: "string", xKey: "string?", yKey: "string?", label: "string?", color: "string?" },
    children: false,
    requiresData: true,
    example: { type: "area-chart", props: { dataKey: "monthlyRevenue", xKey: "month", yKey: "revenue" } },
  },
  "radar-chart": {
    type: "radar-chart",
    legacy: { replacedBy: "table", hint: "Radar charts mislead. Use table or compare." },
    description: "A radar chart for multi-dimensional comparisons.",
    props: { dataKey: "string", subjectKey: "string?", valueKey: "string?", label: "string?", color: "string?" },
    children: false,
    requiresData: true,
    example: { type: "radar-chart", props: { dataKey: "skillScores", subjectKey: "skill", valueKey: "score" } },
  },
  "scatter-chart": {
    type: "scatter-chart",
    legacy: { replacedBy: "trend", hint: "Use trend, or table when exact values matter." },
    description: "A scatter chart for correlations.",
    props: { dataKey: "string", xKey: "string?", yKey: "string?", label: "string?", color: "string?" },
    children: false,
    requiresData: true,
    example: { type: "scatter-chart", props: { dataKey: "experienceVsSalary", xKey: "years", yKey: "salary" } },
  },
  "heatmap": {
    type: "heatmap",
    legacy: { replacedBy: "table", hint: "Use table with highlightKey." },
    description: "A heatmap for matrix data and correlations.",
    props: { dataKey: "string", xKey: "string?", yKey: "string?", valueKey: "string?", caption: "string?" },
    children: false,
    requiresData: true,
    example: { type: "heatmap", props: { dataKey: "riskMatrix", xKey: "category", yKey: "quarter", valueKey: "score" } },
  },
  "log": {
    type: "log",
    legacy: { replacedBy: "code", hint: "Use code with language 'log'." },
    description: "A scrollable terminal-like log output.",
    props: { lines: "string[]?", dataKey: "string?" },
    children: false,
    requiresData: true,
    example: { type: "log", props: { dataKey: "deploymentLogs" } },
  },
  "file-tree": {
    type: "file-tree",
    description: "A collapsible file explorer tree. Defaults to the enhanced look: empty dirs are flattened, file-type icons (iconSet=standard), default density. Add gitStatus for status badges (rows auto-align), searchable for a filter box. File items may carry `content` + `language` (tapping renders a code-block below the tree) or `src` (a repo-relative or absolute path that `visual-artifact create` reads and inlines into `content` at save time).",
    props: { items: "{ name: string, type?: \"file\" | \"directory\", children?: file-tree[], content?: string, language?: string, src?: string }[]", flattenEmpty: "boolean?", searchable: "boolean?", gitStatus: "Record<string, GitStatus>?", density: '"compact" | "default" | "relaxed"?', iconSet: '"minimal" | "standard" | "complete"?', defaultExpanded: "boolean?", notes: "Record<path, string ≤80>? — right-aligned # note; keys are full slash-joined paths like gitStatus keys", statusStyle: '"letters" | "marks"? — marks shows + ~ − and strikes deleted names; plans use marks' },
    children: false,
    example: { type: "file-tree", props: { items: [{ name: "src", type: "directory", children: [{ name: "index.ts", type: "file" }] }], flattenEmpty: true, searchable: true } },
  },
  "image": {
    type: "image",
    description: "An image with optional caption, aspect ratio, and click-to-zoom modal. Place sidecar image files next to the artifact JSON under ~/.pi/artifacts/<project>/ and use a relative path like \"hero.png\". Use absolute HTTPS URLs for external images. Never use file:// URLs.",
    props: { src: "string", alt: "string", caption: "string?", aspect: '"auto" | "square" | "video" | "wide"?', zoom: "boolean?" },
    children: false,
    example: { type: "image", props: { src: "hero.png", alt: "Placeholder", zoom: true } },
  },
  "pie-chart": {
    type: "pie-chart",
    legacy: { replacedBy: "figures", hint: "Pie charts mislead. Use figures or table." },
    description: "A pie chart for proportional data.",
    props: { dataKey: "string", categoryKey: "string", valueKey: "string" },
    children: false,
    requiresData: true,
    example: { type: "pie-chart", props: { dataKey: "browserStats", categoryKey: "browser", valueKey: "visitors" } },
  },
  "stepper": {
    type: "stepper",
    legacy: { replacedBy: "steps", hint: "Use steps (or checklist for status)." },
    description: "A step-by-step progress indicator.",
    props: { items: "{ title: string, description?: string, status?: \"complete\" | \"current\" | \"pending\" }[]" },
    children: false,
    example: { type: "stepper", props: { items: [{ title: "Step 1", status: "complete" }, { title: "Step 2", status: "current" }] } },
  },
  heading: {
    type: "heading",
    legacy: { replacedBy: "chapter", hint: "Use chapter (kicker, title, deck, takeaway) instead of free headings." },
    description: "Section or page heading. Use sparingly; renderer already supplies the page hero.",
    props: { text: "string", level: "1 | 2 | 3 | 4?", align: "left | center | right?" },
    children: false,
    example: { type: "heading", props: { text: "Quarterly Revenue", level: 2 } },
  },
  prose: {
    type: "prose",
    description: "Markdown text for prose, lists, links, and long-form narrative. Use this instead of 'text' when you need multiple paragraphs or basic markdown formatting.",
    props: { content: "string", tone: "default | muted?" },
    children: false,
    example: { type: "prose", props: { content: "Here is a list of items:\n\n- First item\n- Second item\n\n[Learn more](https://example.com)" } },
  },
  text: {
    type: "text",
    legacy: { replacedBy: "prose", hint: "Use prose for paragraphs; chapter carries the headings." },
    description: "Paragraph text for narrative. Keep copy compact; use tables/status grids for structured facts.",
    props: { text: "string", tone: "default | muted?", size: "sm | base | lg?", align: "left | center | right?" },
    children: false,
    example: { type: "text", props: { text: "Revenue grew across enterprise accounts.", tone: "muted" } },
  },
  card: {
    type: "card",
    legacy: { replacedBy: "columns", hint: "No boxes. Use columns for text side by side, or chapter + prose." },
    description: "General content container. Use tone for a subtle left accent; do not wrap every tiny fact in a card when stat-card/status-grid fits better.",
    props: { title: "string?", description: "string?", size: "default | sm?", tone: "default | accent | success | warning | danger?" },
    children: "nodes",
    example: { type: "card", props: { title: "Summary", tone: "accent" }, children: [{ type: "text", props: { text: "One clear idea." } }] },
  },
  metric: {
    type: "metric",
    legacy: { replacedBy: "figures", hint: "Use figures." },
    description: "Compact KPI display inside another container. Prefer stat-card for top-level dashboard KPI tiles.",
    props: { label: "string", value: "string | number", delta: "string?", trend: "up | down | neutral?" },
    children: false,
    example: { type: "metric", props: { label: "Revenue", value: "$128,400", delta: "+12.5%", trend: "up" } },
  },
  "stat-card": {
    type: "stat-card",
    legacy: { replacedBy: "figures", hint: "Use figures: an inline band of at most 4 numbers, no tiles." },
    description: "Standalone dashboard KPI tile. Best for summary bands: counts, state, health, totals, deltas.",
    props: { label: "string", value: "string | number", delta: "string?", trend: "up | down | neutral?", caption: "string?", tone: "default | accent | success | warning | danger?" },
    children: false,
    example: { type: "stat-card", props: { label: "Install state", value: "linked", delta: "healthy", trend: "up", caption: "Tracked targets already linked.", tone: "success" } },
  },
  badge: {
    type: "badge",
    legacy: { replacedBy: "ledger", hint: "Status is a dot plus a word inside ledger or checklist rows." },
    description: "Small passive label. Use for metadata, not primary status summaries.",
    props: { label: "string", variant: "default | secondary | destructive | outline | ghost | link?" },
    children: false,
    example: { type: "badge", props: { label: "On track", variant: "secondary" } },
  },
  button: {
    type: "button",
    legacy: { replacedBy: "links", hint: "Use links for a plain row of underlined links." },
    description: "Action link or button-looking link. Avoid file:// links in shareable artifacts.",
    props: { label: "string", href: "string?", variant: "default | outline | secondary | ghost | destructive | link?", size: "default | xs | sm | lg?" },
    children: false,
    example: { type: "button", props: { label: "Open source", href: "https://example.com", variant: "outline" } },
  },
  separator: {
    type: "separator",
    legacy: { replacedBy: "chapter", hint: "Chapters draw their own rule." },
    description: "Visual separator between sections.",
    props: {},
    children: false,
    example: { type: "separator" },
  },
  "data-table": {
    type: "data-table",
    legacy: { replacedBy: "table", hint: "Use table with dense: true." },
    description: "Dense table variant for operational data, logs, inventories, and evidence lists.",
    props: { dataKey: "string", columns: "(string | { key, label? })[]?", caption: "string?" },
    children: false,
    requiresData: true,
    data: "data[dataKey] must be an array of row objects.",
    example: { type: "data-table", props: { dataKey: "accounts", columns: [{ key: "name", label: "Account" }] } },
  },
  "comparison-table": {
    type: "comparison-table",
    legacy: { replacedBy: "table", hint: "Use table with statusKey (and onlyDiffs)." },
    description: "Dashboard comparison table with stronger first column and optional status chips. Use for options, risks, validations, runtimes, and parity checks.",
    props: { dataKey: "string", columns: "(string | { key, label? })[]?", statusKey: "string?", caption: "string?" },
    children: false,
    requiresData: true,
    data: "data[dataKey] must be an array of row objects. statusKey values are rendered as status chips.",
    example: { type: "comparison-table", props: { dataKey: "checks", columns: ["check", "result", "evidence"], statusKey: "result" } },
  },
  chart: {
    type: "chart",
    legacy: { replacedBy: "trend", hint: "Use trend: bare line or bar with direct labels." },
    description: "Line or bar chart backed by embedded data. Pair charts with table detail when exact values matter.",
    props: { dataKey: "string", xKey: "string", yKey: "string", kind: "line | bar?", label: "string?", color: "string?" },
    children: false,
    requiresData: true,
    data: "data[dataKey] must be an array of row objects containing xKey and yKey.",
    example: { type: "chart", props: { dataKey: "revenueByMonth", xKey: "month", yKey: "revenue", kind: "line" } },
  },
  mermaid: {
    type: "mermaid",
    description: "Client-rendered zoomable/pannable Mermaid diagram with wheel, pinch, drag, keyboard, and fit controls. Provide a required caption that describes the diagram. Use for quick architecture, sequence, flowchart, ERD, state, class, and C4 diagrams from Mermaid text.",
    props: { code: "string", caption: "string", height: "integer? 240-1600" },
    children: false,
    example: { type: "mermaid", props: { caption: "Request flow", code: "flowchart LR\n  Client --> API\n  API --> DB" } },
  },
  "svg-diagram": {
    type: "svg-diagram",
    description: "Full-screen interactive SVG/HTML architecture diagram embedded in a sandboxed iframe. Use when Mermaid cannot lay out the topology cleanly, when you need animated request paths, clickable nodes, or precise visual control. The html value must be a complete self-contained document with hand-rolled CSS variables for light/dark themes, an apply-before-paint theme script, a theme toggle, and an SVG styled through CSS classes (no hard-coded hex inside SVG). Layout rules: pick a viewBox large enough for all nodes; keep at least 30px between node rectangles and 40px between zones; reserve the bottom-right corner for the detail card overlay; route edges and labels through empty space; verify by inspection that nothing overlaps.",
    props: { html: "string", title: "string?", caption: "string?", height: "integer? 240-1600" },
    children: false,
    example: { type: "svg-diagram", props: { title: "Interactive architecture", height: 720, html: "<!doctype html><html><head><script>(function(){try{const k='visualizer-theme',s=localStorage.getItem(k),d=s?s==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}})();</script><style>:root{--bg:#FAF9F5;--ink:#141413;}html.dark{--bg:#141413;--ink:#FAF9F5;}body{background:var(--bg);}</style></head><body><svg viewBox='0 0 100 40'><text x='5' y='24' fill='var(--ink)'>Architecture</text></svg></body></html>" } },
  },
  flow: {
    type: "flow",
    legacy: { replacedBy: "steps", hint: "Use steps: a step line with 1-2 key steps." },
    description: "Inline architecture diagram for ordered handoffs, pipelines, request paths, and deployment chains.",
    props: { title: "string?", caption: "string?", items: "{ title: string, label?: string, description?: string, status?: string }[]" },
    children: false,
    example: { type: "flow", props: { title: "Request path", items: [{ title: "Client", label: "POST /retrieve" }, { title: "FastAPI" }, { title: "ADK pipeline", status: "running" }] } },
  },
  "execution-trace": {
    type: "execution-trace",
    description: "Source-backed call stack for planning or reviewing code changes, especially API surfaces: interfaces, types, transformations, and boundaries. JavaScript-family and Ruby adapters normalize ast-grep facts into one shared trace contract. Select ordered file spans, run `visual-artifact trace inspect` for canonical focus/scope facts, then add narrative context. Create-time verification rejects stale or edited code identity.",
    props: {
      title: "string?",
      caption: "string?",
      provenance: "{ mode: 'captured' | 'inferred' | 'simulated' | 'mixed', method: 'runtime-probe' | 'inspector' | 'static-analysis' | 'author-curated', summary: string, confidence: 'high' | 'medium' | 'low', codeRevision?: string }",
      events: "ExecutionTraceEvent[] (1-100; every event requires source: { src, facts } copied from `visual-artifact trace inspect`; the CLI re-extracts facts and persists { content, facts }; boundary events require boundary.from/to/kind/outcome; values require typed preview + provenance; optional impacts are { kind: 'effect' | 'error', title, description?, codeRef? }[] and should be omitted unless evidence establishes them)",
      typeDefinitions: "{ name: string, definition: string, language?: string, file?: string, line?: number, provenance: 'inferred' | 'derived' }[]? (main domain types referenced by staticType; names must be unique)",
      initialEventId: "string? (select the most review-relevant event on load without changing execution order)",
      showCallStack: "boolean?",
    },
    children: false,
    example: {
      type: "execution-trace",
      props: {
        title: "Artifact validation boundary",
        provenance: { mode: "inferred", method: "static-analysis", summary: "Types and control flow derived from the reviewed source.", confidence: "high" },
        events: [
          {
            id: "validate-spec",
            order: 0,
            phase: "validate",
            kind: "boundary",
            label: "Validate artifact JSON",
            source: {
              src: "shared/src/artifact-schema.ts",
              facts: {
                span: { file: "shared/src/artifact-schema.ts", startLine: 1610, endLine: 1610 },
                excerpt: "  return VisualArtifactSpecSchema.safeParse(value)",
                sourceHash: "04490e3be59080179353fa997da4035cab6e64337bc18e8a4aef2914d1ddc6f6",
                revision: "c8313cafef237497e233c2e5aa2072875b1a613a",
                worktree: "dirty",
                language: "typescript",
                syntaxKind: "call_expression",
                focus: { kind: "call", text: "VisualArtifactSpecSchema.safeParse(value)", symbol: "VisualArtifactSpecSchema.safeParse" },
                scope: { kind: "function", symbol: "safeParseVisualArtifactSpec", startLine: 1605, endLine: 1611 },
                resolution: "resolved",
              },
            },
            boundary: {
              kind: "validation",
              from: { label: "Parsed JSON", system: "runtime" },
              to: { label: "Renderer contract", system: "renderer" },
              outcome: "passed",
            },
            inputs: [{ id: "raw", name: "data", staticType: "unknown", runtimeType: "object", preview: { kind: "object", text: "{ slug, nodes, data }" }, provenance: "inferred" }],
            outputs: [{ id: "spec", name: "spec", staticType: "VisualArtifactSpec", runtimeType: "object", preview: { kind: "object", text: "validated artifact spec" }, provenance: "inferred" }],
            transformation: { summary: "Untrusted JSON becomes a validated renderer contract.", mappings: [{ from: "data", to: "spec", operation: "validate" }] },
            impacts: [{ kind: "error", title: "Rejects invalid artifact data", description: "Validation failure prevents the renderer from accepting the external value.", codeRef: { file: "shared/src/artifact-schema.ts", line: 1610 } }],
            evidence: { origin: "inferred", confidence: "high" },
          },
        ],
      },
    },
  },
  "code-block": {
    type: "code-block",
    legacy: { replacedBy: "code", hint: "Alias: same props as code; prefer the new name." },
    description: "Syntax-highlighted code block with a copy button. Use for commands, config snippets, env contracts, file maps, and ASCII trees. Set language for accurate highlighting (bash, typescript, python, yaml, json, etc.).",
    props: { title: "string?", language: "string?", code: "string", caption: "string?", lineNumbers: "boolean?", startLine: "number? — first gutter number", highlight: '(number | "a-b")[]?', annotations: '{ line: number, title: string ≤80, body?: string ≤280, tone?: "info" | "warn" | "risk" | "ok" }[]? — max 12, one per line, lines are real (startLine-based)', diff: 'boolean? — lines start with "+ ", "- ", "  " or "@@"', sketch: "boolean? — illustrative, not real code", src: '"path:12-30"? — create inlines the range' },
    children: false,
    example: { type: "code-block", props: { title: "Smoke release", language: "bash", code: "git tag smoke-v0.0.1\ngit push origin smoke-v0.0.1" } },
  },
  "claim-tree": {
    type: "claim-tree",
    description: "Plan spine: numbered, collapsible claims with a contents rail. Children must be claim nodes. At most one per spec. open: \"needs\" opens claims that hold a decision.",
    props: { title: "string?", open: '"all" | 1 | 2 | "needs"?', contents: "boolean? — side contents rail (default true)" },
    children: "nodes",
    example: { type: "claim-tree", props: { open: "needs" }, children: [{ type: "claim", props: { text: "The user can pick a time in the composer." }, children: [{ type: "text", props: { text: "Exhibit goes first." } }] }] },
  },
  "claim": {
    type: "claim",
    description: "One numbered plan claim inside a claim-tree or claim (max 3 levels). Children order: one exhibit, then at most one decision or alert, then child claims. aux \"shared\" renders ✱, \"scope\" renders –. ref links to a call-stack row id.",
    props: { text: "string ≤280", aux: '"shared" | "scope"?', ref: "call-stack row id?", open: "boolean?" },
    children: "nodes",
    example: { type: "claim", props: { text: "A worker claims due messages once a minute." }, children: [{ type: "text", props: { text: "Exhibit." } }] },
  },
  "call-stack": {
    type: "call-stack",
    description: "Annotated call stack. Terse rows: column 0 is a mark (+ added, - removed, ~ changed, ? proposed, space context), column 1 a space, the call from column 2; indent 2 spaces per depth. End with \" @ path/file.ts:12\" and \" -- note\". Use **bold** for the focus call. Object rows add id, kind and an inline excerpt shown on click.",
    props: { title: "string?", caption: "string?", rows: '(string | { call, depth, mark?, at?, note?, kind?: "call"|"ui"|"net"|"cond"|"io"|"gap", id?, excerpt?: { code, language?, startLine? } })[] ≤60', repo: "{ name, ref?, baseUrl? (https) }? — links locations", initialRow: "number?" },
    children: false,
    example: { type: "call-stack", props: { title: "The list", rows: ["~ <Sidebar/> @ web/src/nav/Sidebar.tsx:30", "+   <ScheduledFolder/> @ web/src/scheduled/ScheduledFolder.tsx:14", "+     GET /api/scheduled @ web/src/api/scheduled.ts:21"] } },
  },
  "state-machine": {
    type: "state-machine",
    description: "Clickable state machine. Events are terse \"from -event-> to : label\" (event ids are kebab-case). Optional grid places states; traces replay event paths. Screen children (with metadata.id) are shown when a state with screen = that id is selected.",
    props: { title: "string?", caption: "string?", initial: "state id", states: "{ id, label?, description?, final?, mark?, screen?, code?, sets? }[] 2-16", events: '(string | { from, event, to, label?, mark? })[]', grid: '("| a | b | . |" | (id | null)[])[]?', traces: "{ name, events: event[] }[]?" },
    children: "nodes",
    example: { type: "state-machine", props: { initial: "scheduled", states: [{ id: "scheduled" }, { id: "sending" }, { id: "sent", final: true }, { id: "failed", final: true }], events: ["scheduled -at-send-at-> sending : at send_at", "sending -ok-> sent", "+ sending -error-> failed"], grid: ["| scheduled | sending | sent |", "| . | failed | . |"] } },
  },
  "sequence-diagram": {
    type: "sequence-diagram",
    legacy: { replacedBy: "sequence", hint: "Alias: same props as sequence; prefer the new name." },
    description: "Lifeline sequence diagram from terse steps: \"a -> b : text\" (call), \"a --> b\" (reply), \"a -x-> b\" (lost), \"note over a, b: text\", \"--- label ---\" divider. Prefix + - ~ to mark a message. caption is required (one line on why it matters).",
    props: { title: "string?", caption: "string", participants: '{ id, label? ≤28, kind?: "actor"|"service"|"store"|"external", mark? }[] 2-8', steps: "(string | object)[] ≤40" },
    children: false,
    example: { type: "sequence-diagram", props: { caption: "Cancel wins only before the worker claims the row.", participants: [{ id: "user", kind: "actor" }, { id: "api" }, { id: "db", kind: "store" }], steps: ["user -> api : cancel", "api -> db : update status", "db --> api : 1 row", "api --> user : 204"] } },
  },
  "box-diagram": {
    type: "box-diagram",
    legacy: { replacedBy: "map", hint: "Use map: 2-6 nodes, label-safe edges. Split bigger diagrams." },
    description: "Grid-placed box-and-arrow diagram. Terse edges: \"a -> b : label\" (solid), \"a --> b\" (dashed, needs props.dashed legend), \"a => b\" (bold), \"<->\" both ways, + prefix = proposed. Grid rows are \"| a | b | . |\" (max 4 columns).",
    props: { title: "string?", caption: "string?", nodes: '{ id, label ≤40, sub?, shape?: "box"|"pill"|"diamond"|"db"|"circle"|"note"|"actor", tone?, mark?, href?: "#anchor" }[] ≤16', edges: "(string | { from, to, label?, style?, both?, mark? })[]", grid: "GridRow[] ≤6", groups: "{ label, ids }[]? — must fill a grid rectangle", dashed: "string? — what a dashed line means" },
    children: false,
    example: { type: "box-diagram", props: { nodes: [{ id: "web", label: "Web" }, { id: "api", label: "API" }, { id: "db", label: "Postgres", shape: "db" }], edges: ["web -> api : POST", "api -> db"], grid: ["| web | api | db |"] } },
  },
  "mockup": {
    type: "mockup",
    description: "Framed UI mockup built from child nodes (wireframe, text, badge, button, code-block…). Pins point at a child metadata.id or at x/y fractions. No claims, decisions, mockups or state-machines inside.",
    props: { frame: '"none" | "browser" | "phone" | "desktop" | "terminal"', width: "number? 280-1440", label: "string? — URL bar or window title", caption: "string?", pins: "{ n?, target?: metadata.id, x?, y?, text ≤140 }[]? ≤12" },
    children: "nodes",
    example: { type: "mockup", props: { frame: "terminal", label: "zsh" }, children: [{ type: "wireframe", props: { element: "prompt", text: "visual-artifact create plan.json" } }, { type: "wireframe", props: { element: "output", text: "✓ created" } }] },
  },
  "wireframe": {
    type: "wireframe",
    description: "Low-fidelity UI primitive, only inside a mockup. prompt/output need a terminal frame.",
    props: { element: '"navbar"|"sidebar"|"input"|"textarea"|"select"|"toggle"|"checkbox"|"avatar"|"placeholder"|"skeleton-lines"|"toast"|"modal-scrim"|"divider"|"prompt"|"output"|"spinner"', text: "string?", items: "string[]? ≤8", lines: "number? 1-8", state: '"default"|"active"|"disabled"|"error"|"checked"?', mark: "ChangeMark?" },
    children: false,
    example: { type: "wireframe", props: { element: "navbar", items: ["Inbox", "Scheduled"] } },
  },
  "decision": {
    type: "decision",
    description: "A question for the reader; options render as rows (radio ring, label, consequence), exactly one suggested option for single choice. Answers are local page state; one \"Copy decisions as Markdown\" button exports them. Max 5 per spec; ids unique.",
    props: { id: "PlanId", question: "string ≤200", mode: '"single" | "multiple"?', options: "{ id, label ≤80, consequence? ≤100, suggested? }[] 2-6", allowOther: "boolean?" },
    children: false,
    example: { type: "decision", props: { id: "limit", question: "How many scheduled messages per user?", options: [{ id: "fifty", label: "50", suggested: true }, { id: "five-hundred", label: "500" }, { id: "none", label: "No limit", consequence: "risk of abuse" }] } },
  },
  "change-stats": {
    type: "change-stats",
    legacy: { replacedBy: "figures", hint: "Use figures." },
    description: "One-line change summary: +added ~changed −removed files and optional line counts.",
    props: { label: "string?", added: "number", changed: "number", removed: "number", files: "number?", lines: "{ add, del }?" },
    children: false,
    example: { type: "change-stats", props: { added: 4, changed: 2, removed: 0, lines: { add: 212, del: 9 } } },
  },
  "quotes": {
    type: "quotes",
    legacy: { replacedBy: "quote", hint: "Use quote for one pull-quote, or ledger rows with meta for a list." },
    description: "Collapsible list of verbatim source quotes (the \"why\") with source icon, author, date and link.",
    props: { title: "string?", open: "boolean?", items: '{ text ≤600, via: "prompt"|"slack"|"github"|"doc"|"email"|"meeting"|"transcript", from?, date?: YYYY-MM-DD, href?: https }[] 1-8' },
    children: false,
    example: { type: "quotes", props: { items: [{ text: "Users keep asking to send later.", via: "slack", from: "Dana", date: "2026-09-30" }] } },
  },
  "status-grid": {
    type: "status-grid",
    legacy: { replacedBy: "ledger", hint: "Use ledger: groups by status, risk first; data-backed via groupKey." },
    description: "Data-backed grid of operational states with status chips. Best for health, readiness, validation, component state, and risk boards.",
    props: { dataKey: "string", titleKey: "string?", statusKey: "string", descriptionKey: "string?", metaKey: "string?", columns: "1 | 2 | 3 | 4?", caption: "string?" },
    children: false,
    requiresData: true,
    data: "data[dataKey] must be an array of row objects. statusKey chooses chip tone from values like pass/ok/healthy/warn/fail/risk.",
    example: { type: "status-grid", props: { dataKey: "runtimeStatus", titleKey: "component", statusKey: "status", descriptionKey: "notes", columns: 3 } },
  },
  grid: {
    type: "grid",
    legacy: { replacedBy: "columns", hint: "Grids of cards are the anti-pattern. Use columns for text, figures for numbers." },
    description: "Responsive grid layout for child nodes. Use with stat-card, card, badge groups, and mixed dashboard sections.",
    props: { columns: "1 | 2 | 3 | 4?" },
    children: "nodes",
    example: { type: "grid", props: { columns: 2 }, children: [{ type: "card", props: { title: "A" } }] },
  },
  section: {
    type: "section",
    legacy: { replacedBy: "chapter", hint: "Use chapter: it adds a kicker, deck and takeaway." },
    description: "Named content section with optional description. Use sections to create scan rhythm before dense components.",
    props: { title: "string?", description: "string?" },
    children: "nodes",
    example: { type: "section", props: { title: "Findings" }, children: [{ type: "text", props: { text: "One finding." } }] },
  },
  tabs: {
    type: "tabs",
    legacy: { replacedBy: "compare", hint: "Tabs hide content. Use compare or ledger groups." },
    description: "Tabbed organization for alternate views. Good for Pi/OpenCode/wrapper splits or monthly/segment detail.",
    props: { defaultValue: "string?", items: "{ value: string, label: string, nodes: nodes[] }[]" },
    children: "items",
    example: { type: "tabs", props: { items: [{ value: "summary", label: "Summary", nodes: [{ type: "text", props: { text: "Tab content." } }] }] } },
  },
  accordion: {
    type: "accordion",
    legacy: { replacedBy: "details", hint: "Use details for one quiet 'more detail' disclosure." },
    description: "Expandable sections for details, FAQs, sharp edges, or lower-priority evidence. Do not hide primary conclusions here.",
    props: { items: "{ title: string, nodes: nodes[] }[]" },
    children: "items",
    example: { type: "accordion", props: { items: [{ title: "Why?", nodes: [{ type: "text", props: { text: "Because it is useful." } }] }] } },
  },

  chapter: {
    type: "chapter",
    description: "A page chapter: mono kicker, serif title, one deck line, children, then one pull-line takeaway. Replaces section and heading. Each chapter is a rail/TOC entry. Do not number titles.",
    props: { kicker: "string ≤40?", title: "string ≤80", deck: "string ≤200? — one plain sentence", takeaway: "string ≤160? — the quotable line", signal: '"new" | "risk" | "wait"? — colours the takeaway rule' },
    children: "nodes",
    example: { type: "chapter", props: { kicker: "Memory", title: "Long sessions keep their facts", deck: "Facts are saved before the model summarises.", takeaway: "Save first, summarise second." }, children: [{ type: "prose", props: { content: "Memory writes decisions down before compaction runs." } }] },
  },
  columns: {
    type: "columns",
    description: "2 or 3 text columns with a top rule and no boxes. Children: prose, figures, checklist, links or quote only (no diagrams, no nested columns). A prose child starting with '### Heading' gets a mono caps label.",
    props: { count: "2 | 3? — defaults to the number of children" },
    children: "nodes",
    example: { type: "columns", props: { count: 2 }, children: [{ type: "prose", props: { content: "### Before\nTwo writers, one file." } }, { type: "prose", props: { content: "### After\nOne owner per file." } }] },
  },
  callout: {
    type: "callout",
    description: "A margin note: coloured left rule, tone icon, short title, body. No fill, no box. At most two per chapter.",
    props: { tone: '"note" | "risk" | "new" | "wait"', title: "string ≤80?", body: "markdown ≤400" },
    children: false,
    example: { type: "callout", props: { tone: "risk", title: "No secret-file filter yet", body: "The sandbox stops path escapes, not reads of .env inside the root." } },
  },
  details: {
    type: "details",
    description: "One quiet 'more detail' disclosure: chevron plus underlined summary, content opens below with no surface. For evidence, never for the main point.",
    props: { summary: "string ≤80" },
    children: "nodes",
    example: { type: "details", props: { summary: "Full request trace" }, children: [{ type: "prose", props: { content: "Evidence goes here." } }] },
  },
  ledger: {
    type: "ledger",
    description: "Rows of title + body grouped under a coloured label (risk, wait, new, done, none). Replaces status-grid and definition-list. Put what can break first. Colour lives on the group label only. Literal form: groups[]. Data-backed form: dataKey + titleKey + bodyKey + groupKey (+ nextKey, metaKey, groupOrder, signals).",
    props: {
      caption: "string?",
      groups: '{ label ≤40, signal?: "risk"|"wait"|"new"|"done"|"none", hint? ≤80, rows: { title ≤60, body: markdown ≤280, next? ≤140, meta? ≤40, href?: https }[] 1-12 }[] 1-4',
      dataKey: "string? — data-backed variant: data[dataKey] is an array of row objects",
      titleKey: "string? — required with dataKey",
      bodyKey: "string? — required with dataKey",
      groupKey: "string? — required with dataKey; row value names its group",
      nextKey: "string?",
      metaKey: "string?",
      groupOrder: "string[] ≤4? — group order; default is first-seen",
      signals: "Record<group, signal>? — colour per group",
    },
    children: false,
    data: "Data-backed variant: data[dataKey] must be an array of row objects.",
    example: { type: "ledger", props: { groups: [{ label: "Can break something", signal: "risk", hint: "Fix these first.", rows: [{ title: "Stale lockfile hash", body: "Updating a git-pinned tool keeps the old hash.", next: "Recompute on update." }] }, { label: "Waiting on you", signal: "wait", rows: [{ title: "Work Mac check", body: "Not applied since the pin bump." }] }] } },
  },
  checklist: {
    type: "checklist",
    description: "One line per item with a state glyph: done, doing, todo, blocked, dropped. Replaces status chips and stepper-for-status.",
    props: { items: '{ text ≤140, state: "done"|"doing"|"todo"|"blocked"|"dropped", note? ≤140 }[] 1-20' },
    children: false,
    example: { type: "checklist", props: { items: [{ text: "Add the schemas", state: "done" }, { text: "Register stubs", state: "doing" }, { text: "Export the contract", state: "todo" }] } },
  },
  figures: {
    type: "figures",
    description: "An inline band of at most 4 big numbers with a label under each, optional note, sparkline and signal. No tiles. Replaces stat-card, metric and change-stats.",
    props: { items: '{ value: string ≤24 | number, label ≤40, note? ≤80, trend?: number[] 2-24, signal?: "new"|"risk"|"wait" }[] 1-4' },
    children: false,
    example: { type: "figures", props: { items: [{ value: "114K", label: "Typical input", trend: [90, 100, 110, 114] }, { value: "200K", label: "Model limit", signal: "risk" }] } },
  },
  table: {
    type: "table",
    description: "Hairline table backed by embedded data. dense = smaller text, statusKey = dot plus word, highlightKey = boolean column that marks a row, onlyDiffs = hide columns where every row is the same. Absorbs data-table and comparison-table.",
    props: { dataKey: "string", columns: "(string | { key, label?, align?: left|center|right, width? })[]?", caption: "string?", dense: "boolean?", statusKey: "string?", highlightKey: "string?", onlyDiffs: "boolean?" },
    children: false,
    requiresData: true,
    data: "data[dataKey] must be an array of row objects.",
    example: { type: "table", props: { dataKey: "checks", columns: ["check", "result", "evidence"], statusKey: "result", onlyDiffs: true } },
  },
  steps: {
    type: "steps",
    description: "A step line of 2-7 steps with connectors. Mark 1-2 steps key (never all). Replaces flow and stepper. tag is a short mono label in the signal colour.",
    props: { caption: "string ≤240?", items: "{ title ≤40, body? ≤100, tag? ≤24, key?: boolean }[] 2-7", direction: '"row" | "column"?' },
    children: false,
    example: { type: "steps", props: { items: [{ title: "Session grows", body: "Context passes 70%." }, { title: "Memory saves first", tag: "New order", key: true }, { title: "Model summarises" }] } },
  },
  map: {
    type: "map",
    description: "A label-safe map of 2-6 nodes and at most 8 edges. Edges are terse: 'a -> b : label' (solid), 'a --> b' (dashed), '+ a -> b' (proposed). More than 6 nodes is an error: split into two maps or use steps. Caption is required.",
    props: { caption: "string ≤240", nodes: '{ id, label ≤28, sub? ≤40, kind?: "actor"|"service"|"store"|"file"|"external", signal?: "new"|"risk"|"wait" }[] 2-6', edges: "string[] ≤8", layout: '"row" | "column" | "hub"?', legend: "{ solid?, dashed? }?" },
    children: false,
    example: { type: "map", props: { caption: "How a request reaches the store.", nodes: [{ id: "web", label: "Web", kind: "actor" }, { id: "api", label: "API", kind: "service" }, { id: "db", label: "Postgres", kind: "store", signal: "new" }], edges: ["web -> api : POST", "api -> db : write"], layout: "row" } },
  },
  story: {
    type: "story",
    description: "A diagram that assembles as the reader scrolls: a map (up to 8 nodes) plus 2-7 beats, each showing nodes and optionally focusing some. Use one per page, for the core data flow.",
    props: { caption: "string ≤240", diagram: "{ caption?, nodes (2-8, as map), edges ≤8, layout?, legend? }", beats: "{ text: markdown ≤320, show: id[], focus?: id[] }[] 2-7" },
    children: false,
    example: { type: "story", props: { caption: "From a full session to a summary.", diagram: { nodes: [{ id: "session", label: "Session" }, { id: "memory", label: "Memory", signal: "new" }, { id: "summary", label: "Summary" }], edges: ["session -> memory : save facts", "memory -> summary : writes"], layout: "row" }, beats: [{ text: "The session fills up.", show: ["session"] }, { text: "Memory saves the facts first.", show: ["session", "memory"], focus: ["memory"] }, { text: "The summary is written from them.", show: ["session", "memory", "summary"], focus: ["summary"] }] } },
  },
  sequence: {
    type: "sequence",
    description: "Lifeline sequence diagram, at most 10 steps (split bigger ones). Same terse steps as sequence-diagram: 'a -> b : text', 'a --> b', 'a -x-> b', 'note over a, b: text', '--- label ---'. key lists 0-based step indices to emphasise. caption is required.",
    props: { title: "string?", caption: "string", participants: '{ id, label? ≤28, kind?: "actor"|"service"|"store"|"external", mark? }[] 2-8', steps: "(string | object)[] 1-10", key: "number[]? — step indices to emphasise" },
    children: false,
    example: { type: "sequence", props: { caption: "Cancel wins only before the worker claims the row.", participants: [{ id: "user", kind: "actor" }, { id: "api" }, { id: "db", kind: "store" }], steps: ["user -> api : cancel", "api -> db : update status", "db --> api : 1 row", "api --> user : 204"], key: [1] } },
  },
  timeline: {
    type: "timeline",
    description: "A vertical spine with dated ticks, no cards. Literal form: items[] of 2-12. Data-backed form: dataKey with whenKey/titleKey/bodyKey/signalKey (the old markerKey, descriptionKey and statusKey still work).",
    props: { items: '{ when ≤24, title ≤60, body? ≤200, signal?: "new"|"risk"|"wait" }[] 2-12', caption: "string?", dataKey: "string? — data-backed variant", whenKey: "string?", titleKey: "string?", bodyKey: "string?", signalKey: "string?", markerKey: "string? — v1 alias of whenKey", descriptionKey: "string? — v1 alias of bodyKey", statusKey: "string? — v1 alias of signalKey" },
    children: false,
    data: "Data-backed variant: data[dataKey] must be an array of row objects.",
    example: { type: "timeline", props: { items: [{ when: "Oct 4", title: "Pi 1.0.4 live" }, { when: "Oct 7", title: "Tool cards ship", signal: "new" }, { when: "Oct 9", title: "Cloud agents land" }] } },
  },
  compare: {
    type: "compare",
    description: "Before/after or option comparison: two labelled columns with a vertical rule, no boxes. With rows, only differing rows render; identical rows collapse to one muted line. verdict renders as the takeaway.",
    props: { mode: '"before-after" | "options"', left: "{ label ≤40, body: markdown ≤600 }", right: "{ label ≤40, body: markdown ≤600 }", rows: "{ aspect ≤40, left ≤120, right ≤120 }[] ≤10?", verdict: "string ≤160?" },
    children: false,
    example: { type: "compare", props: { mode: "before-after", left: { label: "Before", body: "Two writers, one file." }, right: { label: "After", body: "One owner per file." }, rows: [{ aspect: "Conflicts", left: "Last write wins", right: "Cannot happen" }], verdict: "One owner per file." } },
  },
  code: {
    type: "code",
    description: "Syntax-highlighted code (props identical to code-block; code-block, diff and log are aliases or legacy). Flat surface, title above as mono caps. Use for commands, config, env contracts. Set diff: true for +/- lines.",
    props: { title: "string?", language: "string?", code: "string", caption: "string?", lineNumbers: "boolean?", startLine: "number?", highlight: '(number | "a-b")[]?', annotations: '{ line, title ≤80, body? ≤280, tone? }[]? — max 12', diff: 'boolean? — lines start with "+ ", "- ", "  " or "@@"', sketch: "boolean?", src: '"path:12-30"? — create inlines the range' },
    children: false,
    example: { type: "code", props: { title: "Smoke release", language: "bash", code: "pnpm export:contract\npnpm verify:artifacts" } },
  },
  trend: {
    type: "trend",
    description: "Bare line or bar chart backed by embedded data. Up to 3 series labelled directly at their ends, no legend box. mark adds up to 3 annotated vertical hairlines. caption is required.",
    props: { dataKey: "string", x: "string", y: "string | string[] ≤3", kind: '"line" | "bar"?', caption: "string ≤240", mark: "{ x: string|number, label ≤60 }[] ≤3?" },
    children: false,
    requiresData: true,
    data: "data[dataKey] must be an array of row objects containing x and every y key.",
    example: { type: "trend", props: { dataKey: "inputSizes", x: "week", y: "tokens", caption: "Input size by week.", mark: [{ x: "W3", label: "Haiku switch" }] } },
  },
  links: {
    type: "links",
    description: "A plain inline row of underlined links (sources, references). Hrefs: http, https, mailto, tel or relative.",
    props: { items: "{ label ≤60, href }[] 1-8" },
    children: false,
    example: { type: "links", props: { items: [{ label: "Design review", href: "https://example.com/review" }, { label: "Plan", href: "https://example.com/plan" }] } },
  },
  quote: {
    type: "quote",
    description: "One pull-quote in serif italic with an optional source line (from, via, date, href). A list of quotes is a ledger with meta.",
    props: { text: "string ≤400", from: "string ≤60?", via: '"prompt"|"slack"|"github"|"doc"|"email"|"meeting"|"transcript"?', date: "YYYY-MM-DD?", href: "https url?" },
    children: false,
    example: { type: "quote", props: { text: "Users keep asking to send later.", via: "slack", from: "Dana", date: "2026-09-30" } },
  },
} satisfies Record<ArtifactNodeType, ArtifactManifestEntry>

export const artifactComponentManifest: ArtifactManifestEntry[] = Object.values(artifactManifest)

export interface SpecConstraints {
  slug: {
    type: string
    format: string
    minLength: number
    maxLength: number
  }
  title: {
    type: string
    minLength: number
  }
  description: {
    type: string
    minLength: number
    optional: boolean
  }
  createdAt: {
    type: string
    minLength: number
    optional: boolean
  }
  artifactType: {
    enum: readonly string[]
    optional: boolean
  }
  topics: {
    type: string
    items: string
    optional: boolean
  }
  layout: {
    type: {
      enum: string[]
    }
    columns: {
      enum: number[]
    }
  }
  nodes: {
    type: string
    minItems: number
    maxItems: number
  }
}

export interface ArtifactContract {
  version: string
  spec: SpecConstraints
  limits: ArtifactSpecResourceLimits
  executionTrace: {
    sourceLanguages: readonly ExecutionTraceSourceLanguage[]
  }
  nodeTypes: readonly string[]
  nodes: Record<string, NodeDef>
  dataNodes: readonly string[]
  /** Legacy node types still parse and render but are hidden from `nodes`: type -> what to use instead. */
  legacy: Record<string, string>
  patternExamples: Record<string, { description: string; nodes: unknown[] }>
}

export function createArtifactContract(): ArtifactContract {
  const advertised = artifactComponentManifest.filter((entry) => !entry.legacy)
  return {
    version: CONTRACT_VERSION,
    limits: ARTIFACT_SPEC_RESOURCE_LIMITS,
    executionTrace: {
      sourceLanguages: EXECUTION_TRACE_SOURCE_LANGUAGES,
    },
    spec: {
      slug: ARTIFACT_SPEC_CONSTRAINTS.slug,
      title: ARTIFACT_SPEC_CONSTRAINTS.title,
      description: ARTIFACT_SPEC_CONSTRAINTS.description,
      createdAt: ARTIFACT_SPEC_CONSTRAINTS.createdAt,
      artifactType: ARTIFACT_SPEC_CONSTRAINTS.artifactType,
      topics: ARTIFACT_SPEC_CONSTRAINTS.topics,
      layout: {
        type: {
          enum: Array.from(ARTIFACT_SPEC_CONSTRAINTS.layout.type.enum),
        },
        columns: {
          enum: Array.from(ARTIFACT_SPEC_CONSTRAINTS.layout.columns.enum),
        },
      },
      nodes: {
        type: ARTIFACT_SPEC_CONSTRAINTS.nodes.type,
        minItems: ARTIFACT_SPEC_CONSTRAINTS.nodes.minItems,
        maxItems: ARTIFACT_SPEC_CONSTRAINTS.nodes.maxItems,
      },
    },
    nodeTypes: ARTIFACT_NODE_TYPES,
    nodes: Object.fromEntries(
      advertised.map((entry) => [
        entry.type,
        {
          description: entry.description,
          props: entry.props,
          children: entry.children,
          data: entry.data,
          requiresData: entry.requiresData,
          metadata: { id: "string?" },
          example: entry.example,
        },
      ])
    ),
    dataNodes: advertised.filter((e) => e.requiresData).map((e) => e.type),
    legacy: Object.fromEntries(
      artifactComponentManifest.filter((entry) => entry.legacy).map((entry) => [entry.type, `use ${entry.legacy!.replacedBy}: ${entry.legacy!.hint}`]),
    ),
    patternExamples: artifactPatternExamples,
  }
}

/** Legacy type -> replacement hint, for create/validate warnings. */
export function legacyNodeHint(type: string): string | undefined {
  const entry = (artifactManifest as Record<string, ArtifactManifestEntry>)[type]
  return entry?.legacy ? `${type} is legacy; use ${entry.legacy.replacedBy} (${entry.legacy.hint})` : undefined
}

/** Walk a spec's nodes and collect one warning per legacy type used. */
export function findLegacyNodeWarnings(nodes: readonly unknown[]): string[] {
  const seen = new Map<string, string>()
  const visit = (list: readonly unknown[]) => {
    for (const node of list) {
      if (!node || typeof node !== "object") continue
      const n = node as { type?: unknown; children?: unknown; props?: { items?: unknown } }
      if (typeof n.type === "string" && !seen.has(n.type)) {
        const hint = legacyNodeHint(n.type)
        if (hint) seen.set(n.type, hint)
      }
      if (Array.isArray(n.children)) visit(n.children)
      if ((n.type === "tabs" || n.type === "accordion") && Array.isArray(n.props?.items)) {
        for (const item of n.props.items) {
          const nodes = (item as { nodes?: unknown }).nodes
          if (Array.isArray(nodes)) visit(nodes)
        }
      }
    }
  }
  visit(nodes)
  return [...seen.values()]
}
