"use client"

// claim-tree + claim: numbered, collapsible plan spine with a contents rail.
// Open state is local to the tree; collapsed bodies use `hidden` so node paths stay stable.
import { createContext, useCallback, useContext, useMemo, useState, type KeyboardEvent, type ReactNode } from "react"
import { ChevronRight, MessageSquarePlus } from "lucide-react"

import type { AdapterArgs } from "@/components/artifact-types"
import { useOptionalAnnotationContext } from "@/components/annotations"
import { CopyDecisionsButton } from "@/components/plan/copy-decisions-button"
import { usePlanContext } from "@/components/plan/decision-answers"
import type { ClaimInfo } from "@/lib/plan/plan-spec"
import { cn } from "@/lib/utils"

type TreeState = {
  isOpen: (nodePath: string) => boolean
  toggle: (nodePath: string) => void
  open: (nodePath: string) => void
}

const ClaimTreeContext = createContext<TreeState | null>(null)

export function initialOpenSet(
  claims: Map<string, ClaimInfo>,
  needsOpen: Set<string>,
  open: "all" | 1 | 2 | "needs" | undefined,
  explicit: Map<string, boolean>,
): Set<string> {
  const out = new Set<string>()
  for (const claim of claims.values()) {
    const forced = explicit.get(claim.nodePath)
    const byMode =
      open === "needs" ? needsOpen.has(claim.nodePath) : open === 1 ? claim.depth < 1 : open === 2 ? claim.depth < 2 : true
    if (forced ?? byMode) out.add(claim.nodePath)
  }
  return out
}

export function renderClaimTree(args: AdapterArgs<"claim-tree">) {
  return <ClaimTree {...args} />
}

function ClaimTree({ node, children, nodePath }: AdapterArgs<"claim-tree">) {
  const plan = usePlanContext()
  const claims = useMemo(() => plan?.claims ?? new Map<string, ClaimInfo>(), [plan])
  const [openSet, setOpenSet] = useState<Set<string>>(() => {
    const explicit = new Map<string, boolean>()
    const visit = (nodes: typeof node.children | undefined, prefix: string) =>
      nodes?.forEach((child, index) => {
        if (child.type !== "claim") return
        const path = `${prefix}.${index}`
        if (child.props.open !== undefined) explicit.set(path, child.props.open)
        visit(child.children, `${path}.children`)
      })
    visit(node.children, `${nodePath}.children`)
    return initialOpenSet(claims, plan?.needsOpen ?? new Set(), node.props?.open ?? "all", explicit)
  })
  const toggle = useCallback((path: string) => {
    setOpenSet((previous) => {
      const next = new Set(previous)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])
  const openPath = useCallback(
    (path: string) => {
      setOpenSet((previous) => {
        const next = new Set(previous)
        let current: ClaimInfo | undefined = claims.get(path)
        while (current) {
          next.add(current.nodePath)
          current = current.parentPath ? claims.get(current.parentPath) : undefined
        }
        return next
      })
    },
    [claims],
  )
  const state = useMemo<TreeState>(() => ({ isOpen: (path) => openSet.has(path), toggle, open: openPath }), [openSet, toggle, openPath])
  const mine = [...claims.values()].filter((claim) => claim.nodePath.startsWith(`${nodePath}.`))
  const showContents = node.props?.contents ?? true
  // A tree nested inside a chapter (or any container) is already named by it: no repeated h2.
  const nested = nodePath.includes(".children.")
  const showTitle = !!node.props?.title && !nested

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (target.closest("input, textarea, select")) return
    if (event.key === "[") {
      event.preventDefault()
      setOpenSet(new Set())
    } else if (event.key === "]") {
      event.preventDefault()
      setOpenSet(new Set(mine.map((claim) => claim.nodePath)))
    }
  }

  const goTo = (claim: ClaimInfo) => {
    openPath(claim.nodePath)
    requestAnimationFrame(() => {
      const header = document.getElementById(`${claim.anchor}-toggle`)
      header?.scrollIntoView({ block: "start", behavior: "smooth" })
      header?.focus({ preventScroll: true })
    })
  }

  const contents = (
    <ol className="space-y-1 text-sm">
      {mine.map((claim) => (
        <li key={claim.nodePath} style={{ paddingLeft: `${claim.depth * 0.9}rem` }}>
          <a
            href={`#${claim.anchor}`}
            onClick={(event) => {
              event.preventDefault()
              goTo(claim)
            }}
            className="flex gap-2 rounded px-1.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <span className="shrink-0 font-mono text-xs leading-5">{claim.label}</span>
            <span className="line-clamp-2 leading-5">{claim.text}</span>
            {claim.decisionCount > 0 && claim.depth === 0 && (
              <span className="ml-auto shrink-0 text-xs text-clay-dark dark:text-clay" aria-label={`${claim.decisionCount} decisions`}>
                ◇{claim.decisionCount}
              </span>
            )}
          </a>
        </li>
      ))}
    </ol>
  )

  return (
    <ClaimTreeContext.Provider value={state}>
      <div className="min-w-0 space-y-2" data-claim-tree onKeyDown={onKeyDown}>
        {showContents && (
          <nav aria-label="Plan contents">
            <details className="border-b border-rule pb-2">
              <summary className="cursor-pointer text-sm font-medium">Contents</summary>
              <div className="mt-2">{contents}</div>
            </details>
          </nav>
        )}
        {showTitle && <h2 className="font-serif text-chapter font-medium tracking-[-0.02em] text-ink [text-wrap:balance]">{node.props?.title}</h2>}
        <p className="sr-only">Press [ to collapse all claims and ] to expand all.</p>
        <div className="divide-y divide-rule border-y border-rule">{children}</div>
        <CopyDecisionsButton />
      </div>
    </ClaimTreeContext.Provider>
  )
}

export function renderClaim(args: AdapterArgs<"claim">) {
  return <Claim {...args} />
}

function Claim({ node, children, nodePath }: AdapterArgs<"claim">) {
  const tree = useContext(ClaimTreeContext)
  const plan = usePlanContext()
  const annotations = useOptionalAnnotationContext()
  const info = plan?.claims.get(nodePath)
  const label = info?.label ?? "•"
  const anchor = info?.anchor ?? `claim-${nodePath.replace(/\W+/g, "-")}`
  const depth = info?.depth ?? 0
  const open = tree ? tree.isOpen(nodePath) : true
  const aux = node.props.aux
  const decisions = info?.decisionCount ?? 0

  const comment = () => {
    if (!annotations) return
    annotations.openComments()
    annotations.selectNodeForComment({
      nodeId: node.metadata?.id,
      nodePath,
      nodeType: "claim",
      textSnippet: `${label} ${node.props.text}`.slice(0, 80),
    })
  }

  return (
    <section id={anchor} aria-labelledby={`${anchor}-title`} data-claim={label} data-depth={depth} className={cn(depth > 0 && "ml-2 border-l border-rule sm:ml-4")}>
      <div
        className={cn(
          "flex items-center gap-1 bg-background/95 pr-2 backdrop-blur",
          open && "sticky z-[5]",
        )}
        style={open ? { top: `calc(3.5rem + ${depth} * var(--claim-sticky-step, 2rem))` } : undefined}
      >
        <button
          id={`${anchor}-toggle`}
          type="button"
          aria-expanded={open}
          aria-controls={`${anchor}-body`}
          onClick={() => tree?.toggle(nodePath)}
          className="flex min-w-0 flex-1 scroll-mt-20 items-start gap-3 rounded-md px-2 py-2 text-left outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none", open && "rotate-90")} />
          <span className={cn("w-8 shrink-0 font-mono text-sm leading-6 text-muted-foreground", aux && "text-brand")} aria-label={aux ? (aux === "shared" ? "Shared" : "Out of scope") : `Claim ${label}`}>
            {label}
          </span>
          <span id={`${anchor}-title`} className={cn("min-w-0 flex-1 leading-6 text-foreground", depth === 0 ? "font-serif text-row-title font-medium" : "text-small font-medium")}>
            {node.props.text}
          </span>
          {decisions > 0 && (
            <span className="shrink-0 font-mono text-label uppercase tracking-[0.14em] text-brand">
              {decisions} {decisions === 1 ? "decision" : "decisions"}
            </span>
          )}
        </button>
        {node.props.ref && (
          <a
            href={`#cs-row-${node.props.ref}`}
            className="hidden shrink-0 rounded px-1.5 py-1 font-mono text-xs text-muted-foreground hover:bg-muted hover:text-foreground sm:inline"
            aria-label={`Claim ${label} in call stack`}
          >
            ↗ call stack
          </a>
        )}
        {annotations && (
          <button
            type="button"
            onClick={comment}
            aria-label={`Comment on claim ${label}`}
            className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MessageSquarePlus className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <div id={`${anchor}-body`} hidden={!open} className="space-y-3 pb-3 pl-3 pr-2 sm:pl-9 sm:pr-3">
        {children as ReactNode}
      </div>
    </section>
  )
}
