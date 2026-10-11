// Props schemas for the editorial node set (node-redesign, WP0).
// Hard limits from ai-artifacts/node-redesign/design-spec.md live here so the
// agent gets a schema error instead of an unreadable page.

import { z } from "zod"

import { PlanIdSchema, ShortLabel } from "./plan-primitives.js"
import { QUOTE_SOURCES } from "./plan-schemas.js"
import { normalizeBoxEdges } from "./terse/edges.js"

type Ctx = z.RefinementCtx

function report(ctx: Ctx, path: (string | number)[], message: string) {
  ctx.addIssue({ code: "custom", path, message })
}

export function hrefIsAllowed(href: string): boolean {
  // Browsers ignore leading/control whitespace when interpreting schemes.
  const normalized = href.trim().replace(/[\u0000-\u0020\u007f]/g, "")
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(normalized)?.[1]?.toLowerCase()
  return !scheme || ["http", "https", "mailto", "tel"].includes(scheme)
}

const HttpsUrlSchema = z.string().url().regex(/^https:\/\//, "must be an https URL")
const SafeHrefSchema = z
  .string()
  .min(1)
  .max(2000)
  .refine(hrefIsAllowed, "href uses a disallowed URL scheme; use http, https, mailto, tel, or a relative path")

/** The three semantic hues of the page. Colour is never the only cue. */
export const SignalSchema = z.enum(["new", "risk", "wait"])
export type Signal = z.infer<typeof SignalSchema>

export const LedgerSignalSchema = z.enum(["risk", "wait", "new", "done", "none"])
export type LedgerSignal = z.infer<typeof LedgerSignalSchema>

export const SPLIT_MAP_MESSAGE = "Split into two maps or use steps."

// ---------------------------------------------------------------------------
// Page structure
// ---------------------------------------------------------------------------

export const ChapterPropsSchema = z
  .object({
    kicker: ShortLabel(40).optional(),
    title: ShortLabel(80),
    deck: ShortLabel(200).optional(),
    takeaway: ShortLabel(160).optional(),
    signal: SignalSchema.optional(),
    emphasis: z.enum(["normal", "lead", "quiet"]).optional(),
  })
  .strict()
export type ChapterProps = z.infer<typeof ChapterPropsSchema>

export const ProseSizeSchema = z.enum(["lead", "base"])

export const ColumnsPropsSchema = z
  .object({
    count: z.union([z.literal(2), z.literal(3)]).optional(),
  })
  .strict()
export type ColumnsProps = z.infer<typeof ColumnsPropsSchema>

/** Node types allowed as direct children of `columns`: text and list-like leaves only. */
export const COLUMNS_CHILD_TYPES = ["prose", "figures", "checklist", "links", "quote"] as const

export const CalloutPropsSchema = z
  .object({
    tone: z.enum(["note", "risk", "new", "wait"]),
    title: ShortLabel(80).optional(),
    body: z.string().min(1).max(400),
  })
  .strict()
export type CalloutProps = z.infer<typeof CalloutPropsSchema>

export const DetailsPropsSchema = z.object({ summary: ShortLabel(80) }).strict()
export type DetailsProps = z.infer<typeof DetailsPropsSchema>

// ---------------------------------------------------------------------------
// Status and lists
// ---------------------------------------------------------------------------

const LedgerRowSchema = z
  .object({
    title: ShortLabel(60),
    body: z.string().min(1).max(280),
    next: ShortLabel(140).optional(),
    meta: ShortLabel(40).optional(),
    href: HttpsUrlSchema.optional(),
  })
  .strict()

const LedgerGroupSchema = z
  .object({
    label: ShortLabel(40),
    signal: LedgerSignalSchema.optional(),
    hint: ShortLabel(80).optional(),
    rows: z.array(LedgerRowSchema).min(1).max(12),
  })
  .strict()

const LedgerLiteralSchema = z
  .object({
    caption: z.string().min(1).max(240).optional(),
    groups: z.array(LedgerGroupSchema).min(1).max(4),
  })
  .strict()

const LedgerDataSchema = z
  .object({
    caption: z.string().min(1).max(240).optional(),
    dataKey: z.string().min(1),
    titleKey: z.string().min(1),
    bodyKey: z.string().min(1),
    groupKey: z.string().min(1),
    nextKey: z.string().min(1).optional(),
    metaKey: z.string().min(1).optional(),
    groupOrder: z.array(z.string().min(1)).max(4).optional(),
    signals: z.record(z.string().min(1), LedgerSignalSchema).optional(),
  })
  .strict()

export const LedgerPropsSchema = z.union([LedgerLiteralSchema, LedgerDataSchema])
export type LedgerProps = z.infer<typeof LedgerPropsSchema>
export type LedgerLiteralProps = z.infer<typeof LedgerLiteralSchema>
export type LedgerDataProps = z.infer<typeof LedgerDataSchema>

export const CHECKLIST_STATES = ["done", "doing", "todo", "blocked", "dropped"] as const
export const ChecklistPropsSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            text: ShortLabel(140),
            state: z.enum(CHECKLIST_STATES),
            note: ShortLabel(140).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict()
export type ChecklistProps = z.infer<typeof ChecklistPropsSchema>

export const FiguresPropsSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            value: z.union([z.string().min(1).max(24), z.number()]),
            label: ShortLabel(40),
            note: ShortLabel(80).optional(),
            trend: z.array(z.number()).min(2).max(24).optional(),
            signal: SignalSchema.optional(),
          })
          .strict(),
      )
      .min(1)
      .max(4),
  })
  .strict()
export type FiguresProps = z.infer<typeof FiguresPropsSchema>

const TableColumnSchema = z.union([
  z.string().min(1),
  z
    .object({
      key: z.string().min(1),
      label: z.string().min(1).optional(),
      align: z.enum(["left", "center", "right"]).optional(),
      width: z.string().min(1).max(20).optional(),
    })
    .strict(),
])

/** Backward compatible with the old `{ dataKey, columns?, caption? }` table. */
export const TablePropsSchema = z
  .object({
    dataKey: z.string().min(1),
    columns: z.array(TableColumnSchema).min(1).optional(),
    caption: z.string().min(1).optional(),
    dense: z.boolean().optional(),
    statusKey: z.string().min(1).optional(),
    highlightKey: z.string().min(1).optional(),
    onlyDiffs: z.boolean().optional(),
  })
  .strict()
export type TableProps = z.infer<typeof TablePropsSchema>

// ---------------------------------------------------------------------------
// Explanation and data flow
// ---------------------------------------------------------------------------

export const StepsPropsSchema = z
  .object({
    caption: ShortLabel(240).optional(),
    items: z
      .array(
        z
          .object({
            title: ShortLabel(40),
            body: ShortLabel(100).optional(),
            tag: ShortLabel(24).optional(),
            key: z.boolean().optional(),
          })
          .strict(),
      )
      .min(2)
      .max(7, "A steps line holds at most 7 steps. Split it into two, or group steps."),
    direction: z.enum(["row", "column"]).optional(),
  })
  .strict()
export type StepsProps = z.infer<typeof StepsPropsSchema>

export const MAP_MAX_NODES = 6
export const STORY_MAX_NODES = 8
export const MAP_MAX_EDGES = 8
export const MAP_NODE_KINDS = ["actor", "service", "store", "file", "external"] as const

const MapNodeSchema = z
  .object({
    id: PlanIdSchema,
    label: ShortLabel(28),
    sub: ShortLabel(40).optional(),
    kind: z.enum(MAP_NODE_KINDS).optional(),
    signal: SignalSchema.optional(),
  })
  .strict()

const MapEdgeSchema = z.string().min(1).max(200)

const MapLegendSchema = z
  .object({
    solid: ShortLabel(60).optional(),
    dashed: ShortLabel(60).optional(),
  })
  .strict()

function mapShape(maxNodes: number) {
  return {
    nodes: z.array(MapNodeSchema).min(2).max(maxNodes, SPLIT_MAP_MESSAGE),
    edges: z.array(MapEdgeSchema).max(MAP_MAX_EDGES, SPLIT_MAP_MESSAGE),
    layout: z.enum(["row", "column", "hub"]).optional(),
    legend: MapLegendSchema.optional(),
  }
}

function lintMap(
  props: { nodes: { id: string }[]; edges: string[] },
  ctx: Ctx,
  base: (string | number)[] = [],
): Set<string> {
  const ids = new Set<string>()
  props.nodes.forEach((node, index) => {
    if (ids.has(node.id)) report(ctx, [...base, "nodes", index, "id"], `map node "${node.id}" is declared twice`)
    ids.add(node.id)
  })
  const { edges, errors } = normalizeBoxEdges(props.edges)
  for (const error of errors) report(ctx, [...base, "edges", error.index], error.message)
  edges.forEach((edge, index) => {
    for (const end of [edge.from, edge.to]) {
      if (!ids.has(end)) report(ctx, [...base, "edges", index], `edge ${index + 1}: unknown node "${end}"`)
    }
  })
  return ids
}

export const MapPropsSchema = z
  .object({ caption: ShortLabel(240), ...mapShape(MAP_MAX_NODES) })
  .strict()
  .superRefine((props, ctx) => {
    lintMap(props, ctx)
  })
export type MapProps = z.infer<typeof MapPropsSchema>

const StoryDiagramSchema = z
  .object({ caption: ShortLabel(240).optional(), ...mapShape(STORY_MAX_NODES) })
  .strict()

export const StoryPropsSchema = z
  .object({
    caption: ShortLabel(240),
    diagram: StoryDiagramSchema,
    beats: z
      .array(
        z
          .object({
            text: z.string().min(1).max(320),
            show: z.array(PlanIdSchema).min(1).max(STORY_MAX_NODES),
            focus: z.array(PlanIdSchema).max(STORY_MAX_NODES).optional(),
          })
          .strict(),
      )
      .min(2)
      .max(7),
  })
  .strict()
  .superRefine((props, ctx) => {
    const ids = lintMap(props.diagram, ctx, ["diagram"])
    props.beats.forEach((beat, index) => {
      for (const id of beat.show) {
        if (!ids.has(id)) report(ctx, ["beats", index, "show"], `beat ${index + 1}: unknown node "${id}"`)
      }
      for (const id of beat.focus ?? []) {
        if (!ids.has(id)) report(ctx, ["beats", index, "focus"], `beat ${index + 1}: unknown node "${id}"`)
      }
    })
  })
export type StoryProps = z.infer<typeof StoryPropsSchema>

const TimelineSignalSchema = SignalSchema

const TimelineItemsSchema = z
  .object({
    caption: z.string().min(1).optional(),
    items: z
      .array(
        z
          .object({
            when: ShortLabel(24),
            title: ShortLabel(60),
            body: ShortLabel(200).optional(),
            signal: TimelineSignalSchema.optional(),
          })
          .strict(),
      )
      .min(2)
      .max(12),
  })
  .strict()

/** Data-backed timeline. Accepts the v1 keys (markerKey, descriptionKey, statusKey) and the v2 keys. */
const TimelineDataSchema = z
  .object({
    dataKey: z.string().min(1),
    titleKey: z.string().min(1).optional(),
    markerKey: z.string().min(1).optional(),
    descriptionKey: z.string().min(1).optional(),
    statusKey: z.string().min(1).optional(),
    caption: z.string().min(1).optional(),
    whenKey: z.string().min(1).optional(),
    bodyKey: z.string().min(1).optional(),
    signalKey: z.string().min(1).optional(),
  })
  .strict()

export const TimelinePropsSchema = z.union([TimelineDataSchema, TimelineItemsSchema])
export type TimelineProps = z.infer<typeof TimelinePropsSchema>

export const ComparePropsSchema = z
  .object({
    mode: z.enum(["before-after", "options"]),
    left: z.object({ label: ShortLabel(40), body: z.string().min(1).max(600) }).strict(),
    right: z.object({ label: ShortLabel(40), body: z.string().min(1).max(600) }).strict(),
    rows: z
      .array(
        z
          .object({
            aspect: ShortLabel(40),
            left: ShortLabel(120),
            right: ShortLabel(120),
          })
          .strict(),
      )
      .max(10)
      .optional(),
    verdict: ShortLabel(160).optional(),
  })
  .strict()
export type CompareProps = z.infer<typeof ComparePropsSchema>

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

const TrendValueSchema = z.union([z.string().min(1), z.number()])

export const TrendPropsSchema = z
  .object({
    dataKey: z.string().min(1),
    x: z.string().min(1),
    y: z.union([z.string().min(1), z.array(z.string().min(1)).min(1).max(3)]),
    kind: z.enum(["line", "bar"]).optional(),
    caption: ShortLabel(240),
    mark: z
      .array(z.object({ x: TrendValueSchema, label: ShortLabel(60) }).strict())
      .max(3)
      .optional(),
  })
  .strict()
export type TrendProps = z.infer<typeof TrendPropsSchema>

export const LinksPropsSchema = z
  .object({
    items: z
      .array(z.object({ label: ShortLabel(60), href: SafeHrefSchema }).strict())
      .min(1)
      .max(8),
  })
  .strict()
export type LinksProps = z.infer<typeof LinksPropsSchema>

export const QuotePropsSchema = z
  .object({
    text: z.string().min(1).max(400),
    from: ShortLabel(60).optional(),
    via: z.enum(QUOTE_SOURCES).optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
      .optional(),
    href: HttpsUrlSchema.optional(),
  })
  .strict()
export type QuoteProps = z.infer<typeof QuotePropsSchema>
