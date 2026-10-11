"use client"

import { cn } from "@/lib/utils"
import { formatCell, getRows, MissingData, toTitle } from "@/lib/artifacts/data"
import { SignalChip } from "@/lib/artifacts/status"
import { LABEL_CLASS } from "./rows/signal"
import type { AdapterArgs } from "@/components/artifact-types"
import type { TableProps } from "@agents/visual-artifact-annotations/contract"

type Row = Record<string, unknown>
type Column = { key: string; label: string; align?: "left" | "center" | "right"; width?: string }

const ALIGN = { left: "text-left", center: "text-center", right: "text-right" } as const

function resolveColumns(columns: TableProps["columns"], data: Row[]): Column[] {
  const source = columns?.length ? columns : Object.keys(data[0] ?? {})
  return source.map((column) =>
    typeof column === "string"
      ? { key: column, label: toTitle(column) }
      : { key: column.key, label: column.label ?? toTitle(column.key), align: column.align, width: column.width },
  )
}

/** Drop columns where every row has the same value (never the first column). */
function dropUniform(columns: Column[], data: Row[]) {
  if (data.length < 2) return columns
  return columns.filter((column, index) => {
    if (index === 0) return true
    const first = formatCell(data[0][column.key])
    return data.some((row) => formatCell(row[column.key]) !== first)
  })
}

export type TableViewProps = Omit<TableProps, "dataKey"> & { data: Row[]; dataKey: string }

export function TableView({ data, dataKey, columns, caption, dense, statusKey, highlightKey, onlyDiffs }: TableViewProps) {
  if (!data.length) return <MissingData dataKey={dataKey} />
  let cols = resolveColumns(columns, data).filter((column) => column.key !== highlightKey)
  if (onlyDiffs) cols = dropUniform(cols, data)
  const cell = (row: Row, column: Column) =>
    statusKey === column.key ? <SignalChip value={row[column.key]} /> : formatCell(row[column.key])
  const rowPad = dense ? "py-2" : "py-3.5"

  return (
    <figure data-table className="m-0">
      {caption && <figcaption className="mb-3 text-meta text-ink-muted">{caption}</figcaption>}
      <table className="hidden w-full border-collapse text-left min-[720px]:table">
        <thead>
          <tr className="border-b border-rule-strong">
            {cols.map((column) => (
              <th
                key={column.key}
                style={column.width ? { width: column.width } : undefined}
                className={cn("min-w-[8ch] pb-2 pr-6 align-bottom font-normal text-ink-muted last:pr-0", LABEL_CLASS, ALIGN[column.align ?? "left"])}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => {
            const highlighted = highlightKey ? row[highlightKey] === true : false
            return (
              <tr key={index} data-highlight={highlighted || undefined} className="border-t border-rule first:border-t-0 transition-colors duration-[var(--va-annotation-fast)] odd:bg-muted/15 [@media(hover:hover)]:hover:bg-muted/55 focus-within:bg-muted/55 motion-reduce:transition-none">
                {cols.map((column, columnIndex) => (
                  <td
                    key={column.key}
                    className={cn(
                      "min-w-[8ch] break-words pr-6 align-top last:pr-0 [text-wrap:pretty]",
                      rowPad,
                      ALIGN[column.align ?? "left"],
                      columnIndex === 0 ? "font-serif text-row-title text-ink" : "text-small text-ink",
                      columnIndex === 0 && highlighted && "shadow-[inset_3px_0_0_var(--brand)] pl-3",
                    )}
                  >
                    {cell(row, column)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="space-y-0 min-[720px]:hidden">
        {data.map((row, index) => {
          const [primary, ...rest] = cols
          const highlighted = highlightKey ? row[highlightKey] === true : false
          return (
            <article
              key={index}
              data-highlight={highlighted || undefined}
              className={cn("border-t border-rule py-4 first:border-t-0", highlighted && "border-l-[3px] border-l-brand bg-code-bg/60 pl-3")}
            >
              <p className="m-0 break-words font-serif text-row-title text-ink">{primary && cell(row, primary)}</p>
              <dl className="m-0 mt-1.5 space-y-1">
                {rest.map((column) => (
                  <div key={column.key} className="flex flex-wrap items-baseline gap-x-2">
                    <dt className="m-0 shrink-0 text-[13px] leading-5 text-ink-muted after:content-[':']">{column.label}</dt>
                    <dd className="m-0 min-w-0 break-words text-small text-ink">{cell(row, column)}</dd>
                  </div>
                ))}
              </dl>
            </article>
          )
        })}
      </div>
    </figure>
  )
}

export function renderEditorialTable(args: AdapterArgs<"table">) {
  const { node, context } = args
  return <TableView {...node.props} data={getRows(context.data, node.props.dataKey)} />
}
