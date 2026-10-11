---
description: "Build architecture diagrams: small maps, a scroll story for the core flow, and sequences."
tags: ["visual-artifact", "architecture", "map", "diagrams"]
---

# Architecture diagrams

Use for system topology, module relationships and runtime flows.

## Three sizes

| Size | Nodes | Approach |
|---|---:|---|
| One idea | 2 to 6 | `map`, with a one-sentence caption |
| One flow that builds up | up to 8 | `story`: a map plus 3 to 5 beats revealed on scroll |
| Messages over time | up to 10 steps | `sequence` |
| More than that | | Split. Two maps with a sentence between them, or a map plus a `ledger` of parts |

## Rules

- `map` allows 6 nodes and 8 edges. More is a validation error. Split it.
- Label every edge with the thing that moves ("save facts", "POST"), not a verb like "uses".
- Mark what is **new** with `signal: "new"`, and what can break with `risk`. One or two per diagram.
- Prefer `layout: "row"` for a pipeline, `"hub"` for one centre with spokes, `"column"` for layers.
- Use `+ a -> b` for a proposed edge and `a --> b` for an optional or retired one.
- One `story` per page. Put the full sequence of messages in `details`.
- `mermaid` is only for diagrams `map` and `sequence` cannot draw (ERD, class). `svg-diagram` is the last resort.

## Parts and responsibilities

Do not draw a card per module. Use a `ledger` (title: module, body: what it owns, `next`: what it depends on) or `prose` list rows with `**Label:**`.
