"use client"

import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toneSurfaceClass } from "@/lib/artifacts/status"
import type { ArtifactTone } from "@/lib/contract/artifact-schema"

export function Figure({
  title,
  caption,
  error,
  loading,
  loadingLabel = "Loading…",
  height,
  children,
  className,
  framed = false,
}: {
  title?: string
  caption?: string
  error?: string
  loading?: boolean
  loadingLabel?: string
  height?: number | string
  children?: ReactNode
  className?: string
  /** Legacy opt-in: draw the old bordered surface. Bare by default. */
  framed?: boolean
}) {
  return (
    <figure
      className={cn(
        "flex flex-col gap-3",
        framed && "rounded-2xl border bg-card/80 p-4",
        className
      )}
    >
      {(title || caption) && (
        <figcaption className="flex flex-col gap-1">
          {title && (
            <h3 className="break-words font-serif text-row-title font-medium tracking-[-0.01em] text-ink">
              {title}
            </h3>
          )}
          {caption && (
            <p className="break-words text-meta text-ink-muted">{caption}</p>
          )}
        </figcaption>
      )}
      {error ? (
        <pre className="whitespace-pre-wrap rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </pre>
      ) : loading ? (
        <div
          className="rounded-xl border bg-background/60 p-4"
          style={{ minHeight: height }}
        >
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {loadingLabel}
          </p>
        </div>
      ) : (
        children
      )}
    </figure>
  )
}

export function PanelCard({
  className,
  children,
}: {
  tone?: unknown
  className?: string
  children?: ReactNode
}) {
  return (
    <div
      className={cn(
        "min-h-full border-t border-rule pt-4",
        className
      )}
    >
      {children}
    </div>
  )
}

export function TrendPill({
  trend,
  children,
}: {
  trend: "up" | "down" | "neutral"
  children: ReactNode
}) {
  return (
    <Badge
      variant={
        trend === "down" ? "destructive" : trend === "neutral" ? "outline" : "secondary"
      }
    >
      {children}
    </Badge>
  )
}

export function tonePanelClass(tone: ArtifactTone | undefined) {
  return toneSurfaceClass(tone)
}

export function columnsClass(columns: 1 | 2 | 3 | 4) {
  if (columns === 1) return "grid-cols-1"
  if (columns === 3) return "md:grid-cols-3"
  if (columns === 4) return "md:grid-cols-2 xl:grid-cols-4"

  return "md:grid-cols-2"
}
