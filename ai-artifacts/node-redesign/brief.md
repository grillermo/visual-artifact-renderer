# Node redesign brief

## Goal

Make visual-artifact explainers actually good. Today, asking for a visual explainer produces generic boxes: card grids, card-inside-card, bordered status tiles and box-and-arrow diagrams that look bland and explain nothing. Build a new version of the node set and keep iterating until the output is clearly better and more useful.

Iury's words: "I want better nodes, drop the less useful nodes, and make sure that when I ask for something like that I don't get these boxes. They don't help with anything. They're not appealing."

## Freedom

- You may rewrite, break the architecture, remove nodes, add nodes, change the contract and the skill text. Nothing here is precious.
- Launch as many subagents and Herdr workers as useful.
- Work only in this worktree (branch `node-redesign`, based on `origin/main` 0.10.1). Do not touch the main checkout at `~/dev/personal/tools/var` or the older worktree `~/dev/worktrees/var/visual-explainer-port`.
- Do not push, publish, release or open PRs without asking Iury.
- Do not modify the installed tool under `~/.local/share/agents2/tools/visual-artifact/` or the live server on port 9998. Run your own dev server on another port.

## The loop

1. Critique: render the current output, screenshot it, list what is wrong.
2. Change: redesign nodes, renderer components and the skill guidance.
3. Render real examples and screenshot them (agent-browser), light and dark, desktop and mobile width.
4. Review adversarially: a separate reviewer agent compares before and after screenshots and asks for changes.
5. Repeat until you and the reviewer agree it is clearly better. Then stop and report to Iury.

## Real examples (use real data, not lorem ipsum)

Build a gallery of explainers and plans from real Markdown artifacts that already exist. Rebuild each one in the old style and the new style, side by side, so the improvement is provable. Candidates:

- The current weekly report spec: `~/.agents/skills/visual-artifact/artifacts/agents2/agents2-week-2026-10-04/` (live at http://127.0.0.1:9998/agents2/agents2-week-2026-10-04/). Iury's specific complaint: the "Open loops" `status-grid` (card inside card, pink borders that read as errors, grey WARN/PENDING pills, words breaking mid-word like "stop / s").
- `~/dev/personal/tools/pi-extensions/ai-artifacts/compaction-design/`
- `~/dev/personal/tools/agents2/ai-artifacts/` (tool-ui-inventory, cursor-cloud-mode, agent-skills-distribution, briefings/editorial-direction)
- `~/dev/personal/tools/agents2/docs/` (plans and ADRs)
- Any other `ai-artifacts/**/*.md` plans under `~/dev/personal/tools/*`. Read only; do not edit those repos.

Aim for at least five examples covering different shapes: a weekly report, a design explainer with a data flow, an implementation plan, a decision or comparison, and a status or open-loops board.

## Prior input

- A design review agent is producing `~/dev/personal/tools/agents2/ai-artifacts/explainer-design-alternatives/` (report.html, mockup.html, screenshots). It may still be running. Read it when it exists; do not wait on it.
- Read `~/.pi/agent/skills/article-explainer/SKILL.md` (one diagram that assembles as the reader scrolls, plain quotable prose), plus `frontend-design`, `better-ui` and `emil-design-eng` skills for principles.
- Iury has ADHD. He wants scannable, visually clear pages with strong editorial design, few numbers, real explanation through diagrams and data flow. Plain English.

## Done means

- A redesigned node set and renderer on this branch, with tests and `visual-artifact contract` passing.
- A gallery page (or set of artifacts) with before/after for each real example, plus screenshots in `ai-artifacts/node-redesign/`.
- A short report for Iury: what changed, which nodes were dropped or added, what the reviewer still dislikes.
- Changes left uncommitted or committed locally on `node-redesign`; nothing pushed.
