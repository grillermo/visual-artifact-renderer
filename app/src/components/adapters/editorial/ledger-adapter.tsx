import { getRows, MissingData } from "@/lib/artifacts/data"
import { cn } from "@/lib/utils"
import { Prose } from "@/components/ui/prose"
import { LABEL_CLASS, SIGNAL_ICON, SIGNAL_TEXT, type RowSignal } from "./rows/signal"
import type { AdapterArgs } from "@/components/artifact-types"
import type { LedgerLiteralProps } from "@agents/visual-artifact-annotations/contract"

export type LedgerGroup = LedgerLiteralProps["groups"][number] & { more?: number }

export const MAX_LEDGER_GROUPS = 4
export const MAX_LEDGER_ROWS = 12

function groupsFromData(
  props: Extract<AdapterArgs<"ledger">["node"]["props"], { dataKey: string }>,
  rows: Record<string, unknown>[],
): LedgerGroup[] {
  const order = new Map<string, LedgerGroup>()
  for (const name of props.groupOrder ?? []) order.set(name, { label: name, signal: props.signals?.[name], rows: [] })
  for (const row of rows) {
    const name = String(row[props.groupKey] ?? "")
    if (!order.has(name)) order.set(name, { label: name, signal: props.signals?.[name], rows: [] })
    order.get(name)!.rows.push({
      title: String(row[props.titleKey] ?? ""),
      body: String(row[props.bodyKey] ?? ""),
      next: props.nextKey && row[props.nextKey] != null ? String(row[props.nextKey]) : undefined,
      meta: props.metaKey && row[props.metaKey] != null ? String(row[props.metaKey]) : undefined,
    })
  }
  return [...order.values()]
    .filter((group) => group.rows.length > 0)
    .slice(0, MAX_LEDGER_GROUPS)
    .map((group) => ({
      ...group,
      rows: group.rows.slice(0, MAX_LEDGER_ROWS),
      more: group.rows.length > MAX_LEDGER_ROWS ? group.rows.length - MAX_LEDGER_ROWS : undefined,
    }))
}

/** Shared by the legacy status-grid reroute. */
export function LedgerView({ groups, caption }: { groups: LedgerGroup[]; caption?: string }) {
  return (
    <div data-ledger className="space-y-10">
      {caption && <p className="text-meta text-ink-muted">{caption}</p>}
      {groups.map((group, groupIndex) => {
        const signal = (group.signal ?? "none") as RowSignal
        const Icon = SIGNAL_ICON[signal]
        return (
          <section key={`${group.label}-${groupIndex}`} data-ledger-group data-signal={signal}>
            <header className="mb-3">
              <h3 className={cn("m-0 flex items-center gap-2 font-medium", LABEL_CLASS, SIGNAL_TEXT[signal])}>
                <Icon aria-hidden className="size-3.5 shrink-0" />
                {group.label}
              </h3>
              {group.hint && <p className="mt-1 text-meta text-ink-muted">{group.hint}</p>}
            </header>
            <ul className="m-0 list-none border-b border-rule p-0">
              {group.rows.map((row, index) => {
                const title = row.href ? (
                  <a href={row.href} rel="noreferrer noopener" className="underline decoration-rule-strong/30 underline-offset-4 hover:decoration-current">
                    {row.title}
                  </a>
                ) : (
                  row.title
                )
                return (
                  <li
                    key={index}
                    data-ledger-row
                    className="grid gap-x-8 gap-y-1 border-t border-rule py-4 sm:grid-cols-[minmax(10ch,16rem)_minmax(0,1fr)]"
                  >
                    <div className="min-w-0">
                      <p className="m-0 break-words font-serif text-row-title text-ink [text-wrap:pretty]">{title}</p>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-4">
                        <div className="min-w-0 flex-1 text-small text-ink [&_.prose]:text-small [&_p]:my-0">
                          <Prose>{row.body}</Prose>
                        </div>
                        {row.meta && (
                          <span className="shrink-0 whitespace-nowrap font-mono text-meta text-ink-muted">{row.meta}</span>
                        )}
                      </div>
                      {row.next && (
                        <p className="mt-1.5 break-words text-meta text-ink-muted">
                          <span className="font-semibold text-ink">Next:</span> {row.next}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
            {group.more ? <p className="mt-2 text-meta text-ink-muted">and {group.more} more</p> : null}
          </section>
        )
      })}
    </div>
  )
}

export function renderLedger({ node, context }: AdapterArgs<"ledger">) {
  const props = node.props
  let groups: LedgerGroup[]
  if ("dataKey" in props) {
    const rows = getRows(context.data, props.dataKey)
    if (!rows.length) return <MissingData dataKey={props.dataKey} />
    groups = groupsFromData(props, rows)
  } else {
    groups = props.groups
  }
  return <LedgerView groups={groups} caption={props.caption} />
}
