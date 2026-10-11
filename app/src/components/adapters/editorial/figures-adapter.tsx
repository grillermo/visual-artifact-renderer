import type React from "react"
import { cn } from "@/lib/utils"
import { LABEL_CLASS, SIGNAL_TEXT } from "./rows/signal"
import type { AdapterArgs } from "@/components/artifact-types"

function Sparkline({ values }: { values: number[] }) {
  const min = Math.min(...values)
  const span = Math.max(...values) - min || 1
  const step = 64 / (values.length - 1)
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(14 - ((v - min) / span) * 12).toFixed(1)}`).join(" ")
  return (
    <svg aria-hidden width="64" height="16" viewBox="0 0 64 16" className="shrink-0 overflow-visible">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function renderFigures({ node }: AdapterArgs<"figures">) {
  const { items } = node.props
  return (
    <dl
      data-figures
      data-count={items.length}
      style={{ "--figure-cols": items.length } as React.CSSProperties}
      className="m-0 grid grid-cols-2 gap-x-6 gap-y-8 border-y border-rule py-6 sm:grid-cols-[repeat(var(--figure-cols),minmax(0,1fr))] sm:gap-x-8"
    >
      {items.map((item, index) => {
        const tone = item.signal ? SIGNAL_TEXT[item.signal] : "text-ink"
        return (
          <div key={index} className="m-0 flex min-w-0 flex-col">
            <dt className={cn("order-2 mt-2 break-words", LABEL_CLASS, "text-ink-muted")}>{item.label}</dt>
            <dd className={cn("m-0 flex items-end gap-3 order-1", tone)}>
              <span className="font-serif text-figure tabular-nums tracking-[-0.02em]">{item.value}</span>
              {item.trend && <Sparkline values={item.trend} />}
            </dd>
            {item.note && <dd className="order-3 m-0 mt-1 break-words text-meta text-ink-muted">{item.note}</dd>}
          </div>
        )
      })}
    </dl>
  )
}
