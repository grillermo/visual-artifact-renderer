"use client"

import { ChartShell } from "@/components/chart-shell"
import { Figure, PanelCard } from "@/components/artifact-primitives"
import { LedgerView, type LedgerGroup } from "@/components/adapters/editorial/ledger-adapter"
import { TableView } from "@/components/adapters/editorial/table-adapter"
import { formatCell, getRows, MissingData } from "@/lib/artifacts/data"
import { StatusChip, statusIsVisible, statusTone, toneSignal } from "@/lib/artifacts/status"

import type { AdapterArgs } from "@/components/artifact-types"

export function renderTable({ node, context }: AdapterArgs<"table">) {
  return <TableView {...node.props} data={getRows(context.data, node.props.dataKey)} />
}

export function renderDataTable({ node, context }: AdapterArgs<"data-table">) {
  return <TableView dense {...node.props} data={getRows(context.data, node.props.dataKey)} />
}

export function renderComparisonTable({ node, context }: AdapterArgs<"comparison-table">) {
  return <TableView dense {...node.props} data={getRows(context.data, node.props.dataKey)} />
}

export function renderChart({ node, context }: AdapterArgs<"chart">) {
  const {
    dataKey,
    xKey,
    yKey,
    kind = "line",
    label = yKey,
    color = "var(--chart-2)",
  } = node.props
  const data = getRows(context.data, dataKey)

  if (!data.length) {
    return <MissingData dataKey={dataKey} />
  }

  return (
    <div className="rounded-xl border bg-background/40 p-3">
      <ChartShell data={data} xKey={xKey} yKey={yKey} kind={kind} label={label} color={color} />
    </div>
  )
}

export function renderTimeline({ node, context }: AdapterArgs<"timeline">) {
  // v1 data-backed form only; the editorial `timeline` adapter routes here for it.
  const {
    dataKey,
    titleKey = "title",
    markerKey = "marker",
    descriptionKey = "description",
    statusKey = "status",
    caption,
  } = node.props as Extract<typeof node.props, { dataKey: string }>
  const data = getRows(context.data, dataKey)

  if (!data.length) {
    return <MissingData dataKey={dataKey} />
  }

  return (
    <Figure caption={caption}>
      <div className="relative flex flex-col gap-4 before:absolute before:bottom-4 before:left-[1.125rem] before:top-4 before:w-px before:bg-border">
        {data.map((row, index) => {
          const statusVal = row[statusKey]
          const description = row[descriptionKey]

          return (
            <article key={index} className="relative grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3">
              <div className="relative z-10 flex h-10 w-14 items-center justify-center rounded-full border bg-card px-2 font-mono text-[10px] font-medium leading-tight text-muted-foreground">
                {formatCell(row[markerKey] ?? index + 1)}
              </div>
              <PanelCard tone={statusVal} className="min-w-0">
                <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-start sm:gap-3">
                  <p className="min-w-0 flex-1 break-words font-serif text-lg font-medium leading-snug tracking-[-0.015em] text-foreground">
                    {formatCell(row[titleKey])}
                  </p>
                  {statusIsVisible(statusVal, description) && (
                    <StatusChip value={statusVal} className="shrink-0 justify-start" />
                  )}
                </div>
                <p className="mt-2 min-w-0 break-words text-sm leading-6 text-muted-foreground">
                  {formatCell(description)}
                </p>
              </PanelCard>
            </article>
          )
        })}
      </div>
    </Figure>
  )
}

const STATUS_RANK = { risk: 0, wait: 1, new: 2, done: 3 } as const

const STATUS_HINT = {
  risk: "Fix these first.",
  wait: "Needs a decision or a reply.",
  new: "",
  done: "",
} as const

const STATUS_LABEL = {
  risk: "Can break something",
  wait: "Waiting on you",
  done: "Done",
  new: "Notes",
} as const

/** Legacy status-grid: rendered as a ledger grouped by status, risk first. */
export function renderStatusGrid({ node, context }: AdapterArgs<"status-grid">) {
  const { dataKey, titleKey = "title", statusKey, descriptionKey, metaKey, caption } = node.props
  const data = getRows(context.data, dataKey)

  if (!data.length) {
    return <MissingData dataKey={dataKey} />
  }

  // Group by signal, not raw status: the raw word stays on the row as meta.
  const groups = new Map<string, LedgerGroup & { rank: number; first: number }>()
  data.forEach((row, index) => {
    const raw = row[statusKey] === undefined ? "" : formatCell(row[statusKey])
    const signal = toneSignal(statusTone(raw))
    const group = groups.get(signal) ?? {
      label: STATUS_LABEL[signal],
      signal: signal === "new" ? "none" : signal,
      hint: STATUS_HINT[signal] || undefined,
      rows: [],
      rank: STATUS_RANK[signal],
      first: index,
    }
    const title = row[titleKey] ?? row.component ?? row.name ?? `Item ${index + 1}`
    const description = descriptionKey ? row[descriptionKey] : row.notes ?? row.description
    const extra = metaKey && row[metaKey] !== undefined ? formatCell(row[metaKey]) : undefined
    group.rows.push({
      title: formatCell(title),
      body: description === undefined ? "—" : formatCell(description),
      meta: [raw, extra].filter(Boolean).join(" · ").slice(0, 40) || undefined,
    })
    groups.set(signal, group)
  })

  const ordered = [...groups.values()].sort((a, b) => a.rank - b.rank || a.first - b.first)
  return <LedgerView groups={ordered} caption={caption} />
}
