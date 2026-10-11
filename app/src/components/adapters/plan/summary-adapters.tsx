"use client"

import { FileText, GitPullRequest, Hash, Mail, MessageSquare, Mic, ScrollText, Terminal, type LucideIcon } from "lucide-react"

import type { AdapterArgs } from "@/components/artifact-types"

export function renderChangeStats({ node }: AdapterArgs<"change-stats">) {
  const { label, added, changed, removed, files, lines } = node.props
  const total = files ?? added + changed + removed
  return (
    <p className="flex flex-wrap items-baseline gap-x-5 gap-y-1 border-y border-rule py-3 font-mono text-meta" data-change-stats>
      {label && <span className="font-semibold uppercase tracking-[0.14em] text-ink">{label}</span>}
      <span className="text-ink" aria-label={`${total} files`}>{total} files</span>
      <span className="text-signal-new" aria-label={`${added} new files`}>+{added} new</span>
      <span className="text-signal-wait" aria-label={`${changed} changed files`}>~{changed} changed</span>
      <span className="text-signal-risk" aria-label={`${removed} deleted files`}>−{removed} deleted</span>
      {lines && (
        <span className="text-ink-muted" aria-label={`${lines.add} lines added, ${lines.del} lines deleted`}>
          <span className="text-signal-new">+{lines.add}</span>&nbsp;<span className="text-signal-risk">−{lines.del}</span>&nbsp;lines
        </span>
      )}
    </p>
  )
}

const VIA_ICON: Record<string, LucideIcon> = {
  prompt: Terminal,
  slack: Hash,
  github: GitPullRequest,
  doc: FileText,
  email: Mail,
  meeting: Mic,
  transcript: ScrollText,
}

export function renderQuotes({ node }: AdapterArgs<"quotes">) {
  const { title, open, items } = node.props
  const vias = [...new Set(items.map((item) => item.via))]
  const summary = title ?? `Why · ${items.length} ${items.length === 1 ? "request" : "requests"}`
  return (
    <details open={open} className="group" data-quotes>
      <summary className="flex cursor-pointer list-none items-center gap-3 text-small text-ink-muted underline decoration-rule-strong/40 underline-offset-4 hover:text-ink [&::-webkit-details-marker]:hidden">
        <span className="font-mono transition-transform group-open:rotate-90" aria-hidden="true">▸</span>
        <span className="flex-1">{summary}</span>
        <span className="flex items-center gap-1.5" aria-hidden="true">
          {vias.map((via) => {
            const Icon = VIA_ICON[via] ?? MessageSquare
            return <Icon key={via} className="size-3.5" />
          })}
        </span>
      </summary>
      <div className="mt-5 flex flex-col gap-8">
        {items.map((item, index) => {
          const Icon = VIA_ICON[item.via] ?? MessageSquare
          return (
            <figure key={index} className="flex flex-col gap-2">
              <blockquote className="max-w-[44ch] border-l-[3px] border-ink pl-5 font-serif text-pull italic text-ink [text-wrap:pretty]">“{item.text}”</blockquote>
              <figcaption className="flex flex-wrap items-center gap-1.5 pl-6 text-meta text-ink-muted">
                <Icon className="size-3.5" aria-hidden="true" />
                <span>—</span>
                {item.from && <span className="font-medium text-ink">{item.from}</span>}
                <span>· via {item.via}</span>
                {item.date && <time dateTime={item.date}>· {item.date}</time>}
                {item.href && (
                  <a href={item.href} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
                    · source
                  </a>
                )}
              </figcaption>
            </figure>
          )
        })}
      </div>
    </details>
  )
}
