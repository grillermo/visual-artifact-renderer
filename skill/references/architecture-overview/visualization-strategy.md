---
description: "Plan how an architecture report should be rendered as Visualizer nodes."
date created: 2026-06-16T20:50:00
date modified: 2026-06-28T00:00:00
tags: ["visual-artifact", "architecture", "visualization"]
---

# Visualization strategy

Turn the report direction into a visual plan before writing JSON.

## Inputs

- `facts.md`
- `analysis.md`
- `report-direction.md`
- `visual-artifact contract` (current contract)

## Plan

For each section, decide:

- reader question answered
- best node types
- data keys needed
- diagram shape, if any
- what belongs in the main path vs secondary detail

## Good defaults

- One `chapter` per question the reader has: kicker, title, one-sentence deck, takeaway.
- Opening thesis: a `prose` paragraph before the first chapter.
- Summary numbers: `figures`, at most 4.
- System map: `map` (6 nodes or fewer) or a `story` for the core flow.
- Linear path: `steps`, with 1 or 2 `key` steps.
- Component evidence: `table` (`onlyDiffs`) or `ledger`.
- Health and verification: `ledger` grouped by what to do, or `checklist`.
- Commands and config: `code`.
- Secondary notes: `details`.

## Diagram guidance

- Use `map` for most architecture diagrams, and split anything over 6 nodes.
- Use `sequence` for messages over time.
- Use `mermaid` only for ERD or class diagrams. `svg-diagram` is the last resort.
- Caption diagrams so readers know what to look for.

## Output

Write:

```text
<repoRoot>/ai-artifacts/generated/<slug>/visualization-strategy.md
```

## Next step

Move to [final assembler](./final-assembler.md).
