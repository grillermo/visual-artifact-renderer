// sequence-diagram / sequence: Mermaid sequenceDiagram. Compiler in lib/diagram/sequence-to-mermaid.ts.
import { useMemo } from "react"

import type { AdapterArgs } from "@/components/artifact-types"
import { SequenceCanvas, useSequenceSvg } from "@/components/mermaid/sequence-mermaid"
import { PlanCaption, PlanFrame, PlanHeader } from "./plan-ui"
import { normalizeSequenceSteps } from "@/lib/contract/artifact-manifest"

export function renderSequenceDiagram({ node }: AdapterArgs<"sequence-diagram"> | AdapterArgs<"sequence">) {
  return <SequenceDiagram node={node} />
}

function SequenceDiagram({ node }: Pick<AdapterArgs<"sequence-diagram"> | AdapterArgs<"sequence">, "node">) {
  const { title, caption, participants } = node.props
  const keyList = (node.props as { key?: number[] }).key
  const keyed = useMemo(() => new Set(keyList ?? []), [keyList])
  const input = useMemo(() => ({ participants, steps: normalizeSequenceSteps(node.props.steps).steps }), [participants, node.props.steps])
  const { svg, compiled, error } = useSequenceSvg(input)
  const anyProposed = participants.some((p) => p.mark === "proposed" || p.mark === "added") || input.steps.some((s) => s.kind === "message" && (s.mark === "proposed" || s.mark === "added"))
  const canvas = <SequenceCanvas svg={svg} label={title ?? caption} error={error} input={input} compiled={compiled} keyed={keyed} />
  const legend = anyProposed && (
    <ul className="mt-3 flex gap-4 text-meta text-ink-muted" aria-label="Legend">
      <li className="flex items-center gap-2">
        <svg width="26" height="8" aria-hidden="true"><line x1="0" y1="4" x2="26" y2="4" stroke="var(--signal-new)" strokeWidth="1.3" strokeDasharray="7 5" /></svg>
        proposed
      </li>
    </ul>
  )
  // Editorial 'sequence' renders bare; legacy 'sequence-diagram' keeps the dotted DIAGRAM frame.
  if (node.type === "sequence") {
    return (
      <figure className="m-0 min-w-0" data-sequence-diagram="">
        {title && <div className="mb-3 font-mono text-label uppercase tracking-[0.14em] text-ink-muted">{title}</div>}
        {canvas}
        {legend}
        <figcaption className="mt-3 max-w-[66ch] text-meta text-ink-muted">{caption}</figcaption>
      </figure>
    )
  }
  return (
    <PlanFrame data-sequence-diagram="">
      <PlanHeader chip="diagram" title={title} />
      <div className="va-dot-grid p-3">
        {canvas}
        {legend}
      </div>
      {caption && <PlanCaption>{caption}</PlanCaption>}
    </PlanFrame>
  )
}
