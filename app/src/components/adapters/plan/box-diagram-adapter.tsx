"use client"

// box-diagram (legacy): rendered through the same text-node renderer as `map`.
// Grid and groups are ignored (Mermaid lays the nodes out); tone and mark map to signals.
import { useMemo } from "react"

import type { AdapterArgs } from "@/components/artifact-types"
import { normalizeBoxEdges } from "@/lib/contract/artifact-manifest"
import { PlanCaption, PlanFrame, PlanHeader } from "./plan-ui"
import { MapMermaid } from "@/components/mermaid/map-mermaid"
import type { MapInput, MapKind, MapSignal } from "@/lib/diagram/map-to-mermaid"

const SHAPE_KIND: Record<string, MapKind> = { db: "store", actor: "actor", note: "file", circle: "external" }
const TONE_SIGNAL: Partial<Record<string, MapSignal>> = { green: "new", red: "risk", amber: "risk", blue: "wait" }

export function renderBoxDiagram({ node }: AdapterArgs<"box-diagram">) {
  return <BoxDiagram node={node} />
}

function BoxDiagram({ node }: Pick<AdapterArgs<"box-diagram">, "node">) {
  const { title, caption, dashed } = node.props
  const input = useMemo<MapInput>(
    () => ({
      nodes: node.props.nodes.map((n) => ({
        id: n.id,
        label: n.label,
        sub: n.sub,
        href: n.href,
        kind: n.shape ? SHAPE_KIND[n.shape] : undefined,
        signal: n.mark === "proposed" || n.mark === "added" ? "new" : n.mark === "removed" ? "risk" : TONE_SIGNAL[n.tone ?? "default"],
      })),
      edges: normalizeBoxEdges(node.props.edges).edges,
    }),
    [node.props.nodes, node.props.edges],
  )
  return (
    <PlanFrame data-box-diagram="">
      <PlanHeader chip="diagram" title={title} />
      <div className="va-dot-grid min-w-0 p-3">
        <MapMermaid input={input} label={title ?? caption ?? "Diagram"} legend={dashed ? { dashed } : undefined} />
      </div>
      {caption && <PlanCaption>{caption}</PlanCaption>}
    </PlanFrame>
  )
}
