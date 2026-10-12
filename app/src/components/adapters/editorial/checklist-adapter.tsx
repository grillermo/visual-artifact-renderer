import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AdapterArgs } from "@/components/artifact-types"

type State = AdapterArgs<"checklist">["node"]["props"]["items"][number]["state"]

const LABEL: Record<State, string> = { done: "Done", doing: "In progress", todo: "To do", blocked: "Blocked", dropped: "Dropped" }

function Glyph({ state }: { state: State }) {
  if (state === "blocked") return <AlertTriangle aria-hidden className="size-4 text-signal-risk" />
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4 text-ink">
      {state === "done" && <circle cx="8" cy="8" r="5.5" fill="currentColor" />}
      {state === "doing" && (
        <>
          <circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 3a5 5 0 0 0 0 10z" fill="currentColor" />
        </>
      )}
      {(state === "todo" || state === "dropped") && (
        <circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" className={state === "dropped" ? "opacity-40" : undefined} />
      )}
    </svg>
  )
}

export function renderChecklist({ node }: AdapterArgs<"checklist">) {
  return (
    <ul data-checklist className="m-0 list-none p-0">
      {node.props.items.map((item, index) => (
        <li key={index} data-state={item.state} className="grid grid-cols-[1rem_minmax(0,1fr)] items-baseline gap-x-3 border-t border-rule py-2.5 first:border-t-0">
          <span role="img" aria-label={LABEL[item.state]} className="translate-y-[3px]">
            <Glyph state={item.state} />
          </span>
          <p className={cn("m-0 break-words text-body [text-wrap:pretty]", item.state === "done" && "text-ink-muted", item.state === "dropped" && "text-ink-muted line-through")}>
            {item.text}
            {item.note && <span className="ml-2 text-meta text-ink-muted no-underline">{item.note}</span>}
          </p>
        </li>
      ))}
    </ul>
  )
}
