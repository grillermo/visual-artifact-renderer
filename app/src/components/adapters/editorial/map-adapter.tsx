"use client"

// map: a data-flow diagram of at most 6 text nodes with labelled edges.
// JSON is compiled to Mermaid text (lib/diagram/map-to-mermaid); Mermaid lays it out.
import { useMemo } from "react"

import type { AdapterArgs } from "@/components/artifact-types"
import { MapMermaid } from "@/components/mermaid/map-mermaid"
import { normalizeBoxEdges } from "@/lib/contract/artifact-manifest"
import type { MapInput } from "@/lib/diagram/map-to-mermaid"

export function renderMap({ node }: AdapterArgs<"map">) {
  return <MapNodeView node={node} />
}

function MapNodeView({ node }: Pick<AdapterArgs<"map">, "node">) {
  const { caption, nodes, edges, layout, legend } = node.props
  const input = useMemo<MapInput>(() => ({ nodes, edges: normalizeBoxEdges(edges).edges, layout }), [nodes, edges, layout])
  return <MapMermaid input={input} label={caption} caption={caption} legend={legend} />
}
