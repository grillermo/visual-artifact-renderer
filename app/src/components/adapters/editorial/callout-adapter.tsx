import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"
import { Prose } from "@/components/ui/prose"
import { SIGNAL_TEXT, TONE_ICON } from "./rows/signal"
import type { AdapterArgs } from "@/components/artifact-types"

const TONE_SIGNAL = { note: "none", risk: "risk", new: "new", wait: "wait" } as const

export function renderCallout({ node }: AdapterArgs<"callout">) {
  const { tone, title, body } = node.props
  const signal = TONE_SIGNAL[tone]
  const Icon = TONE_ICON[tone]
  return (
    <aside data-callout data-tone={tone} className="va-callout" style={{"--callout-tone":tone==="note"?"var(--ink-muted)":`var(--signal-${signal})`} as CSSProperties}>
      {title && (
        <p className={cn("m-0 mb-1 flex items-center gap-2 text-small font-semibold", tone === "note" ? "text-ink" : SIGNAL_TEXT[signal])}>
          <Icon aria-hidden className="size-4 shrink-0" />
          {title}
        </p>
      )}
      <div className="text-small text-ink [&_p]:my-0 [&_p+p]:mt-2">
        <Prose>{body}</Prose>
      </div>
    </aside>
  )
}
