"use client"

import { Prose } from "@/components/ui/prose"
import { CodeView } from "@/components/ui/code/code-view"
import { FileTree } from "@/components/ui/file-tree"
import { ArtifactImage } from "@/components/ui/artifact-image"
import { cn } from "@/lib/utils"
import { resolveArtifactImageSrc } from "@/lib/artifacts/image-src"

import type { AdapterArgs } from "@/components/artifact-types"

export function renderFileTree({ node }: AdapterArgs<"file-tree">) {
  const { items, flattenEmpty, searchable, gitStatus, density, iconSet, defaultExpanded, notes, statusStyle } = node.props
  return (
    <FileTree
      items={items}
      flattenEmpty={flattenEmpty}
      searchable={searchable}
      gitStatus={gitStatus}
      density={density}
      iconSet={iconSet}
      defaultExpanded={defaultExpanded}
      notes={notes}
      statusStyle={statusStyle}
    />
  )
}

export function renderImage({ node, context }: AdapterArgs<"image">) {
  const { src, alt, caption, aspect, zoom } = node.props
  return <ArtifactImage src={resolveArtifactImageSrc(src, context.project, context.slug)} alt={alt} caption={caption} aspect={aspect} zoom={zoom} />
}

const LABEL_ITEM = /^[-*]\s+\*\*([^*]+?)\*\*\s*[:\u2013\u2014-]?\s*(.*)$/

/** A markdown list where every item starts with `**Label:**` becomes hairline label rows. */
function parseLabelRows(content: string): { label: string; text: string }[] | null {
  const lines = content.trim().split("\n").filter((line) => line.trim())
  if (lines.length < 2) return null
  const rows: { label: string; text: string }[] = []
  for (const line of lines) {
    const match = LABEL_ITEM.exec(line.trim())
    if (!match) return null
    rows.push({ label: match[1].replace(/[:\u2013\u2014-]\s*$/, "").trim(), text: match[2].trim() })
  }
  return rows
}

export function renderProse({ node }: AdapterArgs<"prose">) {
  const { content, tone, size } = node.props
  const muted = tone === "muted"
  const rows = parseLabelRows(content)

  if (rows) {
    return (
      <dl className="flex max-w-[66ch] flex-col" data-label-rows>
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid gap-x-6 gap-y-1 border-t border-rule py-3 last:border-b min-[720px]:grid-cols-[minmax(10ch,12rem)_1fr]"
          >
            <dt className="break-words font-mono text-label font-medium uppercase tracking-[0.14em] text-ink-muted min-[720px]:pt-1.5">
              {row.label}
            </dt>
            <dd className={cn("break-words text-small", muted ? "text-ink-muted" : "text-ink")}>
              <Prose className="[&>p]:my-0 [&_code]:rounded [&_code]:bg-code-bg [&_code]:px-1 [&_code]:text-[0.9em] [&_code]:before:content-none [&_code]:after:content-none">{row.text}</Prose>
            </dd>
          </div>
        ))}
      </dl>
    )
  }

  return (
    <Prose
      className={[
        size === "lead" ? "max-w-[52ch] text-deck" : "max-w-[66ch] text-body",
        muted ? "text-ink-muted" : "text-ink",
        "[&_strong]:font-semibold [&_code]:rounded [&_code]:bg-code-bg [&_code]:px-1 [&_code]:text-[0.9em] [&_code]:before:content-none [&_code]:after:content-none",
      ].join(" ")}
    >
      {content}
    </Prose>
  )
}

export function renderCode({ node }: AdapterArgs<"code">) {
  return <CodeView {...node.props} />
}
