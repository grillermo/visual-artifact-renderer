import { Prose } from "@/components/ui/prose"
import { cn } from "@/lib/utils"
import type { AdapterArgs } from "@/components/artifact-types"

export function renderCompare({ node }: AdapterArgs<"compare">) {
  const { mode, left, right, rows, verdict } = node.props
  const differing = (rows ?? []).filter((row) => row.left.trim() !== row.right.trim())
  const same = (rows?.length ?? 0) - differing.length
  const beforeAfter = mode === "before-after"

  return (
    <div className="flex flex-col gap-8" data-compare={mode}>
      <div className="grid gap-x-12 gap-y-8 min-[720px]:grid-cols-2 min-[720px]:[&>*+*]:border-l min-[720px]:[&>*+*]:border-rule min-[720px]:[&>*+*]:pl-12">
        <Side label={left.label} body={left.body} tone={beforeAfter ? "muted" : "ink"} />
        <Side label={right.label} body={right.body} tone={beforeAfter ? "new" : "ink"} />
      </div>

      {differing.length > 0 && (
        <div className="flex flex-col" role="table" aria-label="Differences">
          <div
            role="row"
            className="hidden grid-cols-[minmax(10ch,14rem)_1fr_1fr] gap-x-8 border-b border-rule-strong pb-2 font-mono text-label uppercase tracking-[0.14em] text-ink-muted min-[720px]:grid"
          >
            <span role="columnheader">Aspect</span>
            <span role="columnheader">{left.label}</span>
            <span role="columnheader" className={cn(beforeAfter && "text-signal-new")}>{right.label}</span>
          </div>
          {differing.map((row, index) => (
            <div
              key={index}
              role="row"
              className="grid gap-x-8 gap-y-1 border-b border-rule py-4 min-[720px]:grid-cols-[minmax(10ch,14rem)_1fr_1fr]"
            >
              <span role="rowheader" className="break-words font-serif text-row-title text-ink">
                {row.aspect}
              </span>
              <span role="cell" className="break-words text-small text-ink-muted">
                <span className="mr-2 font-mono text-label uppercase tracking-[0.14em] min-[720px]:hidden">{left.label}</span>
                {row.left}
              </span>
              <span role="cell" className="break-words text-small text-ink">
                <span className="mr-2 font-mono text-label uppercase tracking-[0.14em] text-ink-muted min-[720px]:hidden">{right.label}</span>
                {row.right}
              </span>
            </div>
          ))}
        </div>
      )}
      {same > 0 && (
        <p className="text-meta text-ink-muted">
          {same} {same === 1 ? "thing stays" : "things stay"} the same.
        </p>
      )}
      {verdict && (
        <p data-verdict className="max-w-[60ch] text-body font-semibold text-ink">
          {verdict}
        </p>
      )}
    </div>
  )
}

function Side({ label, body, tone }: { label: string; body: string; tone: "muted" | "new" | "ink" }) {
  return (
    <div className="min-w-0">
      <p
        className={cn(
          "mb-3 break-words font-mono text-label uppercase tracking-[0.14em]",
          tone === "new" ? "text-signal-new" : "text-ink-muted"
        )}
      >
        {label}
      </p>
      <Prose className={cn("text-small [&_code]:before:content-none [&_code]:after:content-none", tone === "muted" && "text-ink-muted")}>{body}</Prose>
    </div>
  )
}
