---
description: "Organize structured evidence with table, compare and ledger."
tags: ["visual-artifact", "tables", "comparisons", "data"]
---

# Data organization

Use rows and columns only when the information has them.

## Node selection

| Content | Node |
|---|---|
| Facts with columns | `table` |
| Same table, compact | `table` with `dense: true` |
| Options against criteria | `table` with `onlyDiffs: true` (3 or more options), `compare` (2) |
| Status per row | `table` with `statusKey` (dot plus word) |
| An item with a sentence each | `ledger` |
| A term and its meaning | `ledger` row |

## Spec guidance

- Put rows in `data` and reference them with `dataKey`.
- Use `columns` for order and labels. Aim for 2 to 5 columns.
- Use `onlyDiffs` so identical columns drop out.
- Keep cells short. A cell longer than a sentence belongs in a `ledger` row.

## Anti-patterns

- Bullet lists that should be a table.
- A table with 7 columns. Group the rows with a `ledger` instead.
- Every row saying the same word.
- Emoji or coloured pills as status.
