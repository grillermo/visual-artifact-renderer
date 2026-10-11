"use client"

// box-diagram (legacy): rendered through the same text-node renderer as `map`.
// Old specs keep their grid (columns and rows), tone and mark, but lose the boxes.
import { useMemo } from "react"

import type { AdapterArgs } from "@/components/artifact-types"
import { normalizeBoxEdges, parseGridRows } from "@/lib/contract/artifact-manifest"
import type { MapKind, MapLayoutInput, MapSignal } from "@/lib/diagram/map-layout"

import { MapFigure } from "./diagram-svg"

const SHAPE_KIND: Record<string, MapKind> = { db: "store", actor: "actor", note: "file", circle: "external" }
const TONE_SIGNAL: Partial<Record<string, MapSignal>> = { green: "new", red: "risk", amber: "risk", blue: "wait" }

export function renderBoxDiagram({ node }: AdapterArgs<"box-diagram">) {
  return <BoxDiagram node={node} />
}

function BoxDiagram({ node }: Pick<AdapterArgs<"box-diagram">, "node">) {
  const { title, caption, grid, groups, dashed } = node.props
  const input = useMemo<MapLayoutInput>(
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
      grid: grid ? parseGridRows(grid).cells : undefined,
      groups: groups?.map((g) => ({ label: g.label, ids: g.ids })),
    }),
    [node.props.nodes, node.props.edges, grid, groups],
  )
  return <MapFigure input={input} label={title ?? caption ?? "Diagram"} title={title} caption={caption} legend={dashed ? { dashed } : undefined} />
}
