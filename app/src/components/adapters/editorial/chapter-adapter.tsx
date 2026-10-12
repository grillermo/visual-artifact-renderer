"use client"

import { useChapterRegistry } from "@/components/scroll-active-provider"
import { PullLine } from "./pull-line"
import { chapterId as sharedChapterId } from "@/lib/artifacts/chapter-ids"
import type { AdapterArgs } from "@/components/artifact-types"

export function chapterId(title: string, nodePath: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
  return `chapter-${slug || "section"}-${nodePath.replace(/\W+/g, "-")}`
}

export function renderChapter(args: AdapterArgs<"chapter">) {
  return <Chapter {...args} />
}

function Chapter({ node, children, nodePath }: AdapterArgs<"chapter">) {
  const { kicker, title, deck, takeaway, signal, emphasis = "normal" } = node.props
  const quiet = emphasis === "quiet"
  const lead = emphasis === "lead"
  const id = sharedChapterId(title, nodePath)
  useChapterRegistry({ id, title })

  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      data-chapter
      data-emphasis={emphasis}
      className={[
        "flex scroll-mt-8 flex-col border-t border-rule-strong first:border-t-0 first:pt-0",
        quiet ? "gap-5 pt-6" : lead ? "gap-10 pt-14" : "gap-8 pt-10",
      ].join(" ")}
    >
      <header className={quiet ? "flex flex-col gap-1.5" : "flex flex-col gap-4"}>
        {kicker && (
          <p className="break-words font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
            {kicker}
          </p>
        )}
        <h2
          id={`${id}-title`}
          className={[
            "break-words font-serif font-medium tracking-[-0.02em] text-ink [text-wrap:balance]",
            quiet
              ? "max-w-[32ch] text-[1.625rem] leading-[2rem]"
              : lead
                ? "max-w-[18ch] text-[clamp(2.5rem,6vw,3.75rem)] leading-[1.05]"
                : "max-w-[20ch] text-chapter",
          ].join(" ")}
        >
          {title}
        </h2>
        {deck && (
          <p className={quiet ? "max-w-[60ch] break-words text-body text-ink-muted [text-wrap:pretty]" : "max-w-[52ch] break-words text-deck text-ink-muted [text-wrap:pretty]"}>
            {deck}
          </p>
        )}
      </header>
      {children && <div className="flex flex-col gap-8">{children}</div>}
      {takeaway && (
        <PullLine signal={signal} strong={lead}>{takeaway}</PullLine>
      )}
    </section>
  )
}
