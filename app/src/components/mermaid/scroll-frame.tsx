"use client"

// Shared sideways-scroll frame for Mermaid drawings. Shows a soft right-edge fade while
// more content waits off-screen, so a clipped diagram reads as scrollable.
import { useEffect, useState, type HTMLAttributes, type RefObject } from "react"

import { cn } from "@/lib/utils"

type Props = HTMLAttributes<HTMLDivElement> & { frameRef: RefObject<HTMLDivElement | null>; html: string }

export function MermaidScrollFrame({ frameRef, html, className, ...rest }: Props) {
  const [more, setMore] = useState(false)
  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const run = () => setMore(el.scrollWidth - el.clientWidth - el.scrollLeft > 4)
    run()
    const ro = new ResizeObserver(run)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    el.addEventListener("scroll", run, { passive: true })
    return () => {
      ro.disconnect()
      el.removeEventListener("scroll", run)
    }
  }, [frameRef, html])
  return (
    <div className="relative min-w-0">
      <div
        ref={frameRef}
        className={cn("mm-canvas overflow-x-auto overflow-y-hidden overscroll-x-contain", className)}
        dangerouslySetInnerHTML={{ __html: html }}
        {...rest}
      />
      <div
        aria-hidden
        data-scroll-hint={more ? "more" : "end"}
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent transition-opacity duration-150",
          more ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  )
}
