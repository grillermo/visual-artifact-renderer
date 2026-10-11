import type { ArtifactNode } from "@/lib/contract/artifact-schema"

/** Node types introduced by the editorial redesign. `prose`, `table` and `timeline` predate it. */
const EDITORIAL_NODE_TYPES: ReadonlySet<string> = new Set([
  "chapter",
  "columns",
  "callout",
  "details",
  "ledger",
  "checklist",
  "figures",
  "steps",
  "map",
  "story",
  "sequence",
  "compare",
  "decision",
  "trend",
  "links",
  "quote",
  "code",
])

function containsEditorial(nodes: readonly ArtifactNode[] | undefined): boolean {
  return (nodes ?? []).some((node) => EDITORIAL_NODE_TYPES.has(node.type) || containsEditorial((node as { children?: ArtifactNode[] }).children))
}

/** True when no node anywhere in the spec is an editorial node: the page keeps the pre-redesign shell. */
export function isLegacyOnlySpec(spec: { nodes?: readonly ArtifactNode[] }): boolean {
  return !containsEditorial(spec.nodes)
}
