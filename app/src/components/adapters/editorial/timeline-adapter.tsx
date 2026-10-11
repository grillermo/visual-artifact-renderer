import { cn } from "@/lib/utils"
import { formatCell, getRows, MissingData } from "@/lib/artifacts/data"
import { statusTone, toneSignal } from "@/lib/artifacts/status"
import type { AdapterArgs } from "@/components/artifact-types"

type Signal = "new" | "risk" | "wait"
type Item = { when: string; title: string; body?: string; signal?: Signal }

const DOT = {
  new: "bg-signal-new",
  risk: "bg-signal-risk",
  wait: "bg-signal-wait",
  none: "bg-ink-muted",
} as const

const SIGNAL_WORD = { new: "new", risk: "risk", wait: "waiting" } as const

function asSignal(value: unknown): Signal | undefined {
  if (typeof value !== "string" || !value) return undefined
  if (value === "new" || value === "risk" || value === "wait") return value
  const mapped = toneSignal(statusTone(value))
  return mapped === "done" ? undefined : mapped
}

export function renderEditorialTimeline({ node, context }: AdapterArgs<"timeline">) {
  const props = node.props
  let items: Item[]

  if ("dataKey" in props) {
    const rows = getRows(context.data, props.dataKey)
    if (!rows.length) return <MissingData dataKey={props.dataKey} />
    const whenKey = props.whenKey ?? props.markerKey ?? "when"
    const titleKey = props.titleKey ?? "title"
    const bodyKey = props.bodyKey ?? props.descriptionKey ?? "body"
    const signalKey = props.signalKey ?? props.statusKey ?? "signal"
    items = rows.map((row, index) => ({
      when: formatCell(row[whenKey] ?? row.marker ?? index + 1),
      title: formatCell(row[titleKey]),
      body: row[bodyKey] === undefined ? undefined : formatCell(row[bodyKey]),
      signal: asSignal(row[signalKey]),
    }))
  } else {
    items = props.items
  }

  return (
    <figure className="flex flex-col gap-4" data-timeline>
      {props.caption && <figcaption className="text-meta text-ink-muted">{props.caption}</figcaption>}
      <ol className="flex flex-col">
        {items.map((item, index) => (
          <li
            key={index}
            className="relative flex flex-col gap-1 pb-8 pl-6 last:pb-0 min-[720px]:grid min-[720px]:grid-cols-[8rem_minmax(0,1fr)] min-[720px]:gap-x-6 min-[720px]:pl-0"
          >
            <span className="break-words font-mono min-[720px]:pt-1 min-[720px]:text-right text-meta tabular-nums text-ink-muted">
              {item.when}
            </span>
            <div className="min-w-0 min-[720px]:relative min-[720px]:pl-6">
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-[-4.5px] top-[0.45rem] min-[720px]:top-[0.8rem] z-10 size-[9px] rounded-full ring-4 ring-background",
                  DOT[item.signal ?? "none"]
                )}
              />
              {index < items.length - 1 && (
                <span aria-hidden="true" className="absolute bottom-[-0.5rem] left-0 top-[0.9rem] min-[720px]:top-[1.2rem] w-px bg-ink/30" />
              )}
              <p className="break-words font-serif text-row-title text-ink">
                {item.title}
                {item.signal && <span className="sr-only"> ({SIGNAL_WORD[item.signal]})</span>}
              </p>
              {item.body && <p className="mt-1 break-words text-small text-ink-muted">{item.body}</p>}
            </div>
          </li>
        ))}
      </ol>
    </figure>
  )
}
