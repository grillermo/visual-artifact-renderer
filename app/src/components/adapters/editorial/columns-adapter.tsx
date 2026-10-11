import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"
import type { AdapterArgs } from "@/components/artifact-types"

export function renderColumns({ node, children }: AdapterArgs<"columns">) {
  const count = node.props?.count ?? Math.min(3, Math.max(2, node.children.length))
  const items = Array.isArray(children) ? children : children ? [children] : []

  return (
    <div
      data-columns={count}
      className={cn("grid gap-x-8 gap-y-8 min-[720px]:grid-cols-[repeat(var(--cols),minmax(0,1fr))]")}
      style={{ "--cols": count } as CSSProperties}
    >
      {items.map((child, index) => (
        <div
          key={index}
          className="min-w-0 border-t border-rule pt-5 text-small [&_.prose]:text-small [&_code]:before:content-none [&_code]:after:content-none [&_code]:rounded [&_code]:bg-code-bg [&_code]:px-1 [&_code]:text-[0.9em] [&_h3]:mb-3 [&_h3]:font-mono [&_h3]:text-label [&_h3]:font-medium [&_h3]:uppercase [&_h3]:tracking-[0.14em] [&_h3]:text-ink-muted"
        >
          {child}
        </div>
      ))}
    </div>
  )
}
