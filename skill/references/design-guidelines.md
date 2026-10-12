---
description: "Design principles for visual artifacts. How to choose nodes, structure information, and avoid boxes and generic output."
date created: 2026-06-16
date modified: 2026-10-11
tags: ["visual-artifact", "design", "ui", "guidelines"]
---

# Design guidelines for visual artifacts

The renderer turns a constrained JSON spec into a page. The quality of the page depends on the choices made inside the spec. Treat every artifact as a short publication, not a dump of facts.

Get the current node catalog from `visual-artifact contract`. For a shape to copy, see [recipes](./content-types/recipes.md).

## Information first

Every heading, number and row must move the reader closer to the topic. Do not count things about the page itself (nodes, sections, files). Say the conclusion first.

## Choosing nodes

| Content | Node | Why |
|---|---|---|
| A section with one point | `chapter` (kicker, title, deck, takeaway) | Gives the reader a landing point and the conclusion |
| Narrative | `prose` | Markdown with lists and links |
| 3 short parallel points | `columns` | Open columns, no boxes |
| Facts with an owner, status and next step | `ledger` | Grouped by what the reader must do |
| Work in progress | `checklist` | Open, doing, done, dropped, blocked |
| 3 or 4 key numbers | `figures` | Large numbers, no tiles |
| Rows and columns | `table` | `dense`, `onlyDiffs`, `statusKey` |
| Ordered process | `steps` | 2 to 7 steps, 1 or 2 marked `key` |
| Parts and links | `map` | 6 nodes and 8 edges at most |
| A flow that builds up | `story` | Map plus beats shown on scroll |
| Messages over time | `sequence` | Participants and steps |
| Before and after, or two options | `compare` | Two columns plus rows and a verdict |
| Open question | `decision` | Options with consequences, one suggested |
| One aside | `callout` | Note, risk, or tip; sparingly |
| Secondary detail | `details` | Closed by default |
| Code | `code` | Syntax, annotations, diff |
| Dated events | `timeline` | Spine with dates in the gutter |

Use `mermaid` only for diagram types `map` and `sequence` cannot draw (ERD, class). `svg-diagram` is the last resort.

## The anti-box rules

1. No card, tile or bordered container around ordinary content. Whitespace, rules and type carry the structure.
2. Status is a dot plus a word, never a coloured pill or an emoji.
3. At most three signal colours on a page: new, risk, wait. Grey for the rest.
4. At most 4 figures. At most 6 nodes in a map. At most 7 steps.
5. A chapter has one main exhibit, plus at most one supporting prose, details or callout, and one takeaway.
6. No two consecutive nodes of the same type, unless they are a `ledger` and its caption.
7. No uniform grids. If three things are equal, use `columns` with headings or a `ledger`.
8. Secondary detail goes in `details`.
9. Diagrams get a caption that says what to look for.
10. No emoji in headings.

## Hierarchy and rhythm

- Lead with a `prose` paragraph that answers "what is this?" before any dense content.
- The most important thing gets the most weight: a `figures` row, a `callout`, or a `chapter` takeaway. Everything else is quiet.
- Alternate prose with one visual per chapter. Do not stack three visuals.
- Reference sections (inventories, full tables) go in `details`.

## Anti-patterns

- A grid of cards with a title, body and chip each.
- Neon gradients, dark dashboards, emoji icons.
- Padding with meta-statistics.
- Dumping whole files into `code`. Show structure and the key excerpt.
- A diagram for something with 2 nodes.

## The slop test

Before finishing: would a developer think an AI generated this? If yes, change one of these: layout rhythm, hierarchy, the ratio of prose to tables, or the specificity of the examples. One strong structural choice, such as a `story` or a grouped `ledger`, usually fixes it.

## Quality checks

- [ ] The first node answers "what am I looking at?"
- [ ] Every chapter has a takeaway and one main exhibit and at most one supporting prose, details or callout.
- [ ] No cards, tiles or status pills.
- [ ] Three signal colours at most.
- [ ] Structured comparisons are in `table` or `compare`.
- [ ] Diagrams are captioned and small.
- [ ] Secondary detail is in `details`.
- [ ] `visual-artifact validate` passes.
