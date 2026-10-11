---
description: "Build timelines and roadmaps with a spine and steps, no cards."
tags: ["visual-artifact", "timeline", "roadmap", "phases"]
---

# Timelines and roadmaps

Use for chronological narratives, release plans, migrations and event sequences.

## Structure

- Start with the outcome or the current state.
- `timeline` for dated events (2 to 12 items, `when` in the left gutter).
- `steps` for an ordered process (2 to 7 steps, 1 or 2 marked `key`).
- `checklist` for per-item progress.
- `code` for the exact commands when the timeline is a runbook.

## Data shape

```json
{ "when": "Oct 4", "title": "Pi 1.0.4 live", "body": "New tool-card API pinned.", "signal": "new" }
```

Or data-backed with `dataKey`, `whenKey`, `titleKey`, `bodyKey`, `signalKey`.

## Anti-patterns

- Timelines with no outcomes.
- Every item marked as important.
- Future work that looks finished: use `todo` in a `checklist`, no `signal`.
- Long paragraphs in a timeline row. Keep a body to one or two sentences.
