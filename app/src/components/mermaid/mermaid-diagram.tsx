"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { MermaidViewport } from "./mermaid-viewport"
import { mermaidThemeVariables, svgNaturalSize } from "./mermaid-theme"

const FRAME_CHROME = 16 + 56 // frame padding + toolbar row

let mermaidRenderQueue: Promise<unknown> = Promise.resolve()

function runWithTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Mermaid render timed out after ${ms}ms`))
    }, ms)

    fn().then(
      (result) => {
        clearTimeout(timeoutId)
        resolve(result)
      },
      (error) => {
        clearTimeout(timeoutId)
        reject(error)
      }
    )
  })
}

export function enqueueMermaidRender<T>(renderFn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = async () => {
      try {
        const result = await runWithTimeout(renderFn, 10000)
        resolve(result)
        return result
      } catch (error) {
        reject(error)
        return undefined
      }
    }

    mermaidRenderQueue = mermaidRenderQueue.then(run, run)
  })
}

export type DocumentTheme = "light" | "dark"

/** Follows the `dark` class on <html>, so diagrams re-render when the in-page toggle flips. */
export function useDocumentTheme(): DocumentTheme {
  const [theme, setTheme] = useState<DocumentTheme>("light")
  useEffect(() => {
    const sync = () => setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light")
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])
  return theme
}

/**
 * Render Mermaid text to SVG through the shared queue. Mermaid keeps one global config, so
 * every call re-initialises it. `config` is merged over the shared theme settings.
 */
export async function renderMermaidSvg(id: string, code: string, config: Record<string, unknown> = {}): Promise<string> {
  const rendered = await enqueueMermaidRender(async () => {
    const { default: mermaid } = await import("mermaid")
    const vars = mermaidThemeVariables()
    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      themeVariables: vars,
      securityLevel: "strict",
      fontFamily: vars.fontFamily,
      ...config,
    })
    await mermaid.parse(code)
    return mermaid.render(id, code)
  })
  return rendered.svg
}

export function MermaidDiagram({
  code,
  caption,
  height = 420,
}: {
  code: string
  caption: string
  height?: number
}) {
  const rawId = useId()
  const diagramId = useMemo(
    () => `mermaid-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [rawId]
  )
  const theme = useDocumentTheme()
  const [svg, setSvg] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isMaximized, setIsMaximized] = useState(false)
  const frameRef = useRef<HTMLDivElement>(null)
  const [frameWidth, setFrameWidth] = useState(0)

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setFrameWidth(el.clientWidth))
    observer.observe(el)
    setFrameWidth(el.clientWidth)
    return () => observer.disconnect()
  }, [svg])

  // A small diagram gets a short frame: natural height at <= 100% scale, never above `height`.
  const frameHeight = useMemo(() => {
    const natural = svgNaturalSize(svg)
    if (!natural || !frameWidth) return height
    const scale = Math.min(1, (frameWidth - 16) / natural.width)
    return Math.min(height, Math.ceil(natural.height * scale) + FRAME_CHROME)
  }, [svg, frameWidth, height])

  const normalizedCode = useMemo(
    () =>
      code.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\\\/g, "\\"),
    [code]
  )

  useEffect(() => {
    let cancelled = false

    async function renderDiagram() {
      try {
        setError(null)
        setSvg("")

        const rendered = await enqueueMermaidRender(async () => {
          const { default: mermaid } = await import("mermaid")

          mermaid.initialize({
            startOnLoad: false,
            theme: "base",
            themeVariables: mermaidThemeVariables(),
            securityLevel: "strict",
            fontFamily: mermaidThemeVariables().fontFamily,
          })

          await mermaid.parse(normalizedCode)

          return mermaid.render(`${diagramId}-${theme}`, normalizedCode)
        })

        if (!cancelled) {
          setSvg(rendered.svg)
        }
      } catch (renderError) {
        if (!cancelled) {
          setError(
            renderError instanceof Error
              ? renderError.message
              : "Could not render Mermaid diagram"
          )
        }
      }
    }

    renderDiagram()

    return () => {
      cancelled = true
    }
  }, [normalizedCode, diagramId, theme])

  return (
    <figure className="flex flex-col gap-3">
      {error ? (
        <pre className="whitespace-pre-wrap rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </pre>
      ) : !svg ? (
        <div
          className="rounded-2xl border bg-background/60 p-4"
          style={{ minHeight: height }}
        >
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Rendering Mermaid…
          </p>
        </div>
      ) : (
        <div
          ref={frameRef}
          className="relative p-2"
          style={{ height: frameHeight }}
        >
          <MermaidViewport
            svg={svg}
            height={frameHeight - 16}
            instructionsId={`${diagramId}-instructions`}
            onToggleMaximize={() => setIsMaximized(true)}
          />
        </div>
      )}

      <figcaption className="break-words px-1 text-sm leading-6 text-muted-foreground">
        {caption}
      </figcaption>

      <Dialog open={isMaximized} onOpenChange={setIsMaximized}>
        <DialogContent
          className="gap-0 overflow-hidden rounded-2xl p-0"
          style={{
            width: "min(calc(100vw - 1rem), 80rem)",
            maxWidth: "calc(100vw - 1rem)",
            height: "calc(100dvh - 1rem)",
            maxHeight: "calc(100dvh - 1rem)",
          }}
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{caption}</DialogTitle>
          </DialogHeader>
          <div className="flex h-full min-h-0 flex-col gap-3 p-2">
            {error ? (
              <pre className="whitespace-pre-wrap overflow-auto rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </pre>
            ) : (
              <div className="relative flex-1 p-2">
                <MermaidViewport
                  svg={svg}
                  height="100%"
                  instructionsId={`${diagramId}-instructions-maximized`}
                  isMaximized
                  onToggleMaximize={() => setIsMaximized(false)}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </figure>
  )
}
