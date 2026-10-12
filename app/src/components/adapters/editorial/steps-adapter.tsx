// steps: a chain of markers on one line. Key steps get a green filled marker and the
// line segment after them turns green too. Row on wide screens, a spine on narrow ones.
import type { AdapterArgs } from "@/components/artifact-types"
import { cn } from "@/lib/utils"

type Item = AdapterArgs<"steps">["node"]["props"]["items"][number]

function Marker({ keyed, index }: { keyed: boolean; index: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative z-10 grid size-4 shrink-0 place-items-center rounded-full border-[1.5px] bg-background",
        keyed ? "border-signal-new bg-signal-new" : "border-ink/60",
      )}
    >
      {!keyed && <span className="sr-only">{index + 1}</span>}
    </span>
  )
}

function StepText({ item, keyed }: { item: Item; keyed: boolean }) {
  return (
    <div className="min-w-0">
      {item.tag && (
        <div className={cn("mb-1 font-mono text-label uppercase tracking-[0.14em]", keyed ? "text-signal-new" : "text-ink-muted")}>{item.tag}</div>
      )}
      <div className="text-[16px] font-semibold leading-snug break-words text-ink">
        {keyed && <span className="sr-only">Key step: </span>}
        {item.title}
      </div>
      {item.body && <p className="mt-1 text-meta break-words text-ink-muted">{item.body}</p>}
    </div>
  )
}

export function renderSteps({ node }: AdapterArgs<"steps">) {
  const { caption, items, direction } = node.props
  const row = direction !== "column"
  return (
    <figure className="m-0" data-steps="" data-direction={row ? "row" : "column"}>
      <ol
        className={cn("m-0 list-none p-0", row ? "flex flex-col min-[720px]:grid" : "flex flex-col")}
        style={row ? ({ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` } as React.CSSProperties) : undefined}
      >
        {items.map((item, index) => {
          const keyed = !!item.key
          const last = index === items.length - 1
          return (
            <li
              key={index}
              className={cn("relative flex gap-4", row ? "min-[720px]:block min-[720px]:pr-5" : "")}
              data-key={keyed ? "true" : undefined}
            >
              {/* connector: runs from this marker to the next one */}
              {!last && (
                <>
                  <span
                    aria-hidden
                    data-connector=""
                    className={cn(
                      "absolute left-[7.5px] top-4 bottom-0 w-px",
                      row && "min-[720px]:bottom-auto min-[720px]:left-4 min-[720px]:right-0 min-[720px]:top-[7.5px] min-[720px]:h-px min-[720px]:w-auto",
                      keyed ? "bg-signal-new" : "bg-ink/30",
                    )}
                  />
                </>
              )}
              <div className={cn("flex shrink-0 pt-[3px]", row && "min-[720px]:pt-0")}>
                <Marker keyed={keyed} index={index} />
              </div>
              <div className={cn("pb-7", last && "pb-0", row && "min-[720px]:mt-3 min-[720px]:pb-0")}>
                <StepText item={item} keyed={keyed} />
              </div>
            </li>
          )
        })}
      </ol>
      {caption && <figcaption className="mt-5 max-w-[66ch] text-meta text-ink-muted">{caption}</figcaption>}
    </figure>
  )
}
