import { ChevronRight } from "lucide-react"
import type { AdapterArgs } from "@/components/artifact-types"

export function renderDetails({ node, children }: AdapterArgs<"details">) {
  return (
    <details data-details className="group">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-small text-ink-muted underline decoration-rule-strong/30 underline-offset-4 outline-none transition-colors duration-[120ms] ease-out hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-brand [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden className="size-4 shrink-0 transition-transform duration-150 motion-reduce:transition-none group-open:rotate-90" />
        {node.props.summary}
      </summary>
      <div className="mt-2 space-y-8 group-open:animate-[details-fade_140ms_ease-out] motion-reduce:animate-none">{children}</div>
    </details>
  )
}
