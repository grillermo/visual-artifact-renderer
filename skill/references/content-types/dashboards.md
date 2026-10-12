---
description: "Build status and metric summaries with few numbers and grouped rows, no tiles."
tags: ["visual-artifact", "dashboard", "metrics", "status"]
---

# Dashboards and metrics

Use for readiness boards, health overviews and compact operational reports.

## Structure

1. Open with one sentence that says the state.
2. `figures`: 3 or 4 numbers at most. Never a grid of tiles.
3. `ledger` grouped by what to do: can break something, then waiting on someone, then done.
4. `trend` only when change over time is the point.
5. A dense `table` with `statusKey` in `details` for the full evidence.

## Node selection

| Content | Node |
|---|---|
| Hero numbers | `figures` (sparkline with `trend`) |
| Items that need action | `ledger` |
| Per-item progress | `checklist` |
| Trend with an event | `trend` with `mark` |
| Full inventory | `table` (`dense`, `statusKey`) inside `details` |

## Anti-patterns

- A tile per fact, or any equally weighted row of boxes.
- Counting things about the page itself (nodes, sections, files).
- Pie, donut and radar charts. Use `figures` or `table`.
- Colour on every row. Colour belongs on the group label.
