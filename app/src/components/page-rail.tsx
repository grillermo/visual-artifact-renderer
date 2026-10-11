"use client"

import { useEffect, type ReactNode } from "react"

import { cn } from "@/lib/utils"
import { useChapterRegistry, type ChapterEntry } from "@/components/scroll-active-provider"

export const RAIL_MIN_CHAPTERS = 3

function useActiveChapter() {
  const { chapters, activeId, setActiveId } = useChapterRegistry()
  const key = chapters.map((c) => c.id).join("|")

  useEffect(() => {
    if (!key) return
    const ids = key.split("|")
    const onScroll = () => {
      let current: string | null = null
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.3) current = id
      }
      setActiveId(current)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [key, setActiveId])

  // Seeded chapters arrive in document order from the spec; no DOM sorting during
  // render, so server and client markup match.
  return { chapters, activeId }
}

/** Two-column shell: rail column (>=1200px, >=3 chapters) plus content. */
export function RailLayout({ children }: { children: ReactNode }) {
  const { chapters } = useChapterRegistry()
  const hasRail = chapters.length >= RAIL_MIN_CHAPTERS

  return (
    <div
      className={cn("va-rail-layout", hasRail && "min-[1200px]:grid min-[1200px]:grid-cols-[180px_minmax(0,1fr)] min-[1200px]:gap-12")}
    >
      {hasRail && (
        <aside className="min-w-0 min-[1200px]:row-span-1">
          <PageRail />
        </aside>
      )}
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/** Sticky mini-TOC on wide screens; a "Contents" disclosure below 1200px. Hidden under 3 chapters. */
export function PageRail() {
  const { chapters, activeId } = useActiveChapter()
  if (chapters.length < RAIL_MIN_CHAPTERS) return null

  return (
    <nav
      aria-label="Chapters"
      data-slot="page-rail"
      className="sticky top-[calc(var(--header-height)+2rem)] hidden w-[180px] min-[1200px]:block"
    >
      <ChapterLinks chapters={chapters} activeId={activeId} />
    </nav>
  )
}

function ChapterLinks({ chapters, activeId }: { chapters: ChapterEntry[]; activeId: string | null }) {
  return (
    <ol className="space-y-2">
      {chapters.map((chapter) => {
        const active = chapter.id === activeId
        return (
          <li key={chapter.id}>
            <a
              href={`#${chapter.id}`}
              aria-current={active ? "location" : undefined}
              className={cn(
                "block break-words border-l-2 py-0.5 pl-3 text-meta transition-colors duration-[120ms] ease-out",
                active
                  ? "border-ink font-medium text-ink"
                  : "border-transparent text-ink-muted hover:text-ink"
              )}
            >
              {chapter.title}
            </a>
          </li>
        )
      })}
    </ol>
  )
}

/** Below 1200px: one "Contents" disclosure, placed under the hero. Hidden under 3 chapters. */
export function ContentsDisclosure() {
  const { chapters, activeId } = useActiveChapter()
  if (chapters.length < RAIL_MIN_CHAPTERS) return null

  return (
    <details data-slot="page-rail-mobile" className="mb-12 border-y border-rule min-[1200px]:hidden">
      <summary className="flex min-h-11 cursor-pointer items-center font-mono text-label uppercase tracking-[0.14em] text-ink-muted">
        Contents
      </summary>
      <nav aria-label="Chapters" className="pb-4">
        <ChapterLinks chapters={chapters} activeId={activeId} />
      </nav>
    </details>
  )
}
