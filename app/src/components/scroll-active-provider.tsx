"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

const SCROLL_IDLE_MS = 700
const SCROLLING_CLASS = "is-scrolling"
const SCROLL_AREA_SELECTOR = "[data-slot='scroll-area']"

import type { ChapterEntry } from "@/lib/artifacts/chapter-ids"

export type { ChapterEntry }

type ChapterRegistry = {
  chapters: ChapterEntry[]
  register: (entry: ChapterEntry) => () => void
  activeId: string | null
  setActiveId: (id: string | null) => void
}

const ChapterRegistryContext = createContext<ChapterRegistry | null>(null)

/**
 * Mounted once per artifact page by VisualArtifactRenderer.
 * `initialChapters` is seeded from the spec (collectChapters) so the rail is in the
 * server/static HTML and the layout does not shift after hydration. Seeded entries
 * stay put; runtime registration only adds chapters the seed missed.
 */
export function ChapterRegistryProvider({
  children,
  initialChapters = [],
}: {
  children: ReactNode
  initialChapters?: ChapterEntry[]
}) {
  const [chapters, setChapters] = useState<ChapterEntry[]>(initialChapters)
  const [activeId, setActiveId] = useState<string | null>(null)
  const seededIds = useMemo(() => new Set(initialChapters.map((c) => c.id)), [initialChapters])

  const register = useCallback(
    (entry: ChapterEntry) => {
      if (seededIds.has(entry.id)) return () => {}
      setChapters((prev) => [...prev.filter((c) => c.id !== entry.id), entry])
      return () => setChapters((prev) => prev.filter((c) => c.id !== entry.id))
    },
    [seededIds]
  )

  const value = useMemo(
    () => ({ chapters, register, activeId, setActiveId }),
    [chapters, register, activeId]
  )

  return <ChapterRegistryContext.Provider value={value}>{children}</ChapterRegistryContext.Provider>
}

/**
 * Chapter adapters call `useChapterRegistry({ id, title })` to appear in the page rail.
 * The rail calls it with no argument to read `{ chapters, activeId }`.
 * Outside a provider it is a harmless no-op, so adapters render standalone in tests.
 */
export function useChapterRegistry(entry?: ChapterEntry) {
  const ctx = useContext(ChapterRegistryContext)
  const register = ctx?.register
  const id = entry?.id
  const title = entry?.title

  useEffect(() => {
    if (!register || !id || title === undefined) return
    return register({ id, title })
  }, [register, id, title])

  return {
    chapters: ctx?.chapters ?? [],
    activeId: ctx?.activeId ?? null,
    setActiveId: ctx?.setActiveId ?? (() => {}),
  }
}

export function ScrollActiveProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const timers = new Map<Element, number>()

    const markScrolling = (element: Element) => {
      element.classList.add(SCROLLING_CLASS)

      const previousTimer = timers.get(element)
      if (previousTimer) window.clearTimeout(previousTimer)

      const timer = window.setTimeout(() => {
        element.classList.remove(SCROLLING_CLASS)
        timers.delete(element)
      }, SCROLL_IDLE_MS)

      timers.set(element, timer)
    }

    const getScrollElement = (target: EventTarget | null) => {
      if (
        target === window ||
        target === document ||
        target === document.documentElement ||
        target === document.body
      ) {
        return document.documentElement
      }

      return target instanceof Element ? target : null
    }

    const onScroll = (event: Event) => {
      const element = getScrollElement(event.target)
      if (!element) return

      markScrolling(element)

      const scrollArea = element.closest(SCROLL_AREA_SELECTOR)
      if (scrollArea) markScrolling(scrollArea)
    }

    document.addEventListener("scroll", onScroll, { capture: true, passive: true })
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      document.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("scroll", onScroll)
      timers.forEach((timer, element) => {
        window.clearTimeout(timer)
        element.classList.remove(SCROLLING_CLASS)
      })
      timers.clear()
    }
  }, [])

  return children
}
