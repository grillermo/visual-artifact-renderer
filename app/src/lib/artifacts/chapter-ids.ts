import type { ArtifactNode } from "@/lib/contract/artifact-schema"

export type ChapterEntry = { id: string; title: string }

/** DOM id for a chapter. Shared by the chapter adapter and the server-side rail seed. */
export function chapterId(title: string, nodePath: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
  return `chapter-${slug || "section"}-${nodePath.replace(/\W+/g, "-")}`
}

/**
 * Walks spec nodes in document order and returns every chapter.
 * Node paths match the renderer: `nodes.0`, `nodes.0.children.1`, ...
 */
export function collectChapters(nodes: readonly ArtifactNode[] | undefined, prefix = "nodes"): ChapterEntry[] {
  const out: ChapterEntry[] = []
  nodes?.forEach((node, index) => {
    const nodePath = `${prefix}.${index}`
    const props = node.props as { title?: unknown } | undefined
    if (node.type === "chapter" && typeof props?.title === "string") {
      out.push({ id: chapterId(props.title, nodePath), title: props.title })
    }
    if ("children" in node && Array.isArray(node.children)) {
      out.push(...collectChapters(node.children as ArtifactNode[], `${nodePath}.children`))
    }
  })
  return out
}
