---
description: "Five page shapes with copyable skeletons: weekly report, design explainer, implementation plan, decision, status board."
tags: ["visual-artifact", "recipes", "editorial"]
---

# Shape recipes

Pick the shape first, then copy the skeleton and fill it with real content. Full worked specs for all five shapes live in `ai-artifacts/node-redesign/examples/after/` in the source repo. `visual-artifact contract` also prints a `patternExamples` entry per shape.

Every shape follows the anti-box rules in `SKILL.md`: no cards, status as dot plus word, at most three signal colours, small diagrams, one takeaway per chapter.

## 1. Weekly report

```text
prose            opening paragraph: what moved, in plain words
chapter × N      one per theme: kicker, title, deck (1 sentence), takeaway
  steps | map | compare | columns | table   one main exhibit, plus at most one supporting prose, details or callout, per theme
chapter          "What is still open"
  ledger         data-backed (groupKey), "Can break something" then "Waiting on you"
```

- A process in order is `steps`, with the new thing marked `key`.
- Parts and how they link is a `map` of 6 nodes or fewer.
- Home versus work, or before versus after, is `compare`.
- Three short parallel points are `columns` with `### Heading` labels.
- Fixed defects are a `table` without the status column. If they are all fixed, say so in the caption.
- Put the long sequence diagram in `details`.

## 2. Design explainer with data flow

```text
prose            what this design is for, one paragraph
chapter  "How it works"
  story          the core data flow, 3 to 5 beats, shown one by one
  details        table of what each stage receives and returns
chapter  "Evidence"
  figures        3 or 4 numbers
  callout        note: what the evidence cannot show
  callout        risk: what can go wrong
chapter  "Plan"
  steps          the phases, one marked key
  ledger         Do / Do not
```

- One `story` per page. Reuse its node ids in the beats; each beat adds nodes.
- Use `figures` only for numbers the reader acts on, not counts of things.

## 3. Implementation plan

```text
prose            what gets built, in two sentences
chapter  "Rules"       steps (the loop) + prose list with **Label:** items
chapter  "M0"…"Mn"     checklist of slices, optionally one code block
chapter  "Risks"       ledger: Can break something, then Waiting on you
decision × 2-5         open questions, one option marked suggested
```

- Each `checklist` item is one slice. Acceptance goes in the item `note`.
- Use `state: "blocked"` for work waiting on sign-off.
- If each step needs an exhibit (call stack, state machine, mockup), use a `claim-tree`. See `plans.md`.

## 4. Decision or comparison

```text
prose            the recommendation in two sentences
chapter  "Problem"          ledger: "Can break something" then costs
chapter  "Options"          table (onlyDiffs: true) or compare
chapter  "Recommendation"   compare (options) + steps; takeaway = the decision
chapter  "Next"             checklist; details for deletions
chapter  "Open questions"   decision × N
```

- Name what was rejected, and why, in one line each.
- Use `table` for 3 or more options. Use `compare` for 2.
- The `verdict` or chapter `takeaway` is the decision in one sentence.

## 5. Status or open-loops board

```text
prose            what this is and what it is not
chapter  "Coverage"   figures (≤4), callout note, details (dense table)
chapter  "Loops"      ledger: risk, then wait, then done
chapter  "Plan"       checklist
```

- Group by what the reader must do. Do not make a card per item.
- If nothing was tested, say so in the opening paragraph and in a `callout`.
- The full inventory belongs in `details` as a dense `table` with `statusKey`.
