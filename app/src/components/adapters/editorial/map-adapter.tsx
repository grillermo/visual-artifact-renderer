"use client"

// map: a data-flow diagram of at most 6 text nodes with labelled edges.
// Layout and label placement are pure (lib/diagram), drawing lives in plan/diagram-svg.
import { useMemo } from "react"

import type { AdapterArgs } from "@/components/artifact-types"
import { normalizeBoxEdges } from "@/lib/contract/artifact-manifest"
import type { MapLayoutInput } from "@/lib/diagram/map-layout"

import { MapFigure } from "../plan/diagram-svg"

export function renderMap({ node }: AdapterArgs<"map">) {
  return <MapNodeView node={node} />
}

function MapNodeView({ node }: Pick<AdapterArgs<"map">, "node">) {
  const { caption, nodes, edges, layout, legend } = node.props
  const input = useMemo<MapLayoutInput>(() => ({ nodes, edges: normalizeBoxEdges(edges).edges, layout }), [nodes, edges, layout])
  return <MapFigure input={input} label={caption} caption={caption} legend={legend} preferred={layout === "column" ? "column" : "row"} />
}
