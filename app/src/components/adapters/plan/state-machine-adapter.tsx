"use client"

// state-machine: Mermaid draws the diagram; a state row (buttons) selects a state whose screen
// child renders below. Inactive screens stay mounted but `hidden`, so node paths are stable.
import { Children, useMemo, useState } from "react"

import type { AdapterArgs } from "@/components/artifact-types"
import { MachineCanvas, useMachineSvg } from "@/components/mermaid/state-machine-mermaid"
import { normalizeMachineEvents } from "@/lib/contract/artifact-manifest"
import { cn } from "@/lib/utils"

/** Replays a trace from `initial`; returns the visited states (initial first). */
export function replayTrace(initial: string, events: readonly { from: string; event: string; to: string }[], trace: readonly string[]): string[] {
  const out = [initial]
  let current = initial
  for (const name of trace) {
    const edge = events.find((e) => e.from === current && e.event === name)
    if (!edge) break
    current = edge.to
    out.push(current)
  }
  return out
}

export function renderStateMachine(args: AdapterArgs<"state-machine">) {
  return <StateMachine {...args} />
}

function StateMachine({ node, children: renderedChildren }: AdapterArgs<"state-machine">) {
  const { title, caption, initial, states, traces } = node.props
  const { events } = useMemo(() => normalizeMachineEvents(node.props.events), [node.props.events])
  const input = useMemo(() => ({ initial, states, events }), [initial, states, events])
  const { svg, compiled, error } = useMachineSvg(input)
  const [selected, setSelected] = useState(initial)
  const [trace, setTrace] = useState<{ name: string; step: number } | null>(null)
  const current = states.find((s) => s.id === selected)
  const children = node.children ?? []
  const screenIndex = current?.screen ? children.findIndex((child) => child.metadata?.id === current.screen) : -1

  const select = (id: string) => {
    setSelected(id)
    setTrace(null)
  }

  const stepTrace = (name: string) => {
    const t = traces?.find((tr) => tr.name === name)
    if (!t) return
    const path = replayTrace(initial, events, t.events)
    const step = trace?.name === name ? (trace.step + 1) % path.length : 0
    setTrace({ name, step })
    setSelected(path[step])
  }

  const traceIndex = trace ? replayTrace(initial, events, traces?.find((t) => t.name === trace.name)?.events ?? []) : null

  return (
    <figure className="m-0 min-w-0" data-state-machine="">
      {title && <div className="mb-3 font-mono text-label uppercase tracking-[0.14em] text-ink-muted">{title}</div>}
      <MachineCanvas svg={svg} label={title ?? "State machine"} error={error} input={input} compiled={compiled} selected={selected} onSelect={select} />
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1" aria-label="States">
        {states.map((state) => (
          <li key={state.id}>
            <button
              type="button"
              data-state={state.id}
              aria-pressed={state.id === selected}
              aria-label={`State ${state.label ?? state.id}${state.final ? ", final" : ""}${state.id === initial ? ", initial" : ""}`}
              onClick={() => select(state.id)}
              className={cn(
                "border-b border-transparent font-mono text-meta text-ink-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-ring",
                state.id === selected && "border-ink text-ink",
              )}
            >
              {state.label ?? state.id}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-rule pt-3 text-sm">
        <span className="font-mono text-xs text-muted-foreground">state</span>
        <span className="font-mono font-semibold" aria-live="polite">{current?.label ?? selected}</span>
        {current?.description && <span className="text-muted-foreground">— {current.description}</span>}
        {current?.sets && <code className="px-0.5 underline decoration-rule underline-offset-4 text-xs">sets {current.sets}</code>}
        {current?.code && <code className="px-0.5 underline decoration-rule underline-offset-4 text-xs text-muted-foreground">{current.code}</code>}
        {traces && traces.length > 0 && (
          <span className="ml-auto flex flex-wrap gap-1.5">
            {traces.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => stepTrace(t.name)}
                aria-label={`Step trace ${t.name}`}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 font-mono text-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                  trace?.name === t.name && "border-brand text-brand",
                )}
              >
                ▶ {t.name}
                {trace?.name === t.name && traceIndex && ` ${trace.step + 1}/${traceIndex.length}`}
              </button>
            ))}
          </span>
        )}
      </div>
      {children.length > 0 && (
        <div className="mt-4 border-t border-rule pt-4">
          {Children.toArray(renderedChildren).map((child, index) => (
            <div key={index} hidden={index !== screenIndex} data-screen={children[index]?.metadata?.id}>
              {child}
            </div>
          ))}
          {screenIndex < 0 && <p className="text-sm text-muted-foreground">No screen for this state.</p>}
        </div>
      )}
      {caption && <figcaption className="mt-3 max-w-[66ch] text-meta text-ink-muted">{caption}</figcaption>}
    </figure>
  )
}
