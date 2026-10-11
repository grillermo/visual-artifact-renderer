# Cycle 1 brief: code walkthrough components

Implement `ai-artifacts/ui-v2/code-walkthrough.md` sections 2, 3, 4 following the build order in section 5, one commit per step, gate green at every commit.

Coordinator decisions on the open questions (do not reopen):

1. **New major means removal, not aliases.** `diff`, `code-block`, `call-stack` are not kept as legacy hints or routed through `CodeView`. They are deleted from the contract and the registry (cycle 0 removed `LEGACY_NODE_TYPES`; if any of these survived, remove them now). `code` and `walkthrough` and `execution-trace` are the only code nodes. Update `skill/SKILL.md`, `ai-artifacts/docs/nodes.md`, and the contract examples accordingly. `pnpm verify:artifacts` covers the repo's own fixtures only; rewrite those fixtures to the new nodes.
2. **Tone colours in diffs.** Notes inside a diff may use only `info`, `risk`, `idea`; `ok` is rejected by the schema when `before`/`after` or `diff: true` is set, so green keeps one meaning (added).
3. **Split diff fallback.** Split falls back to unified below 720px container width and also when p90 line length > 70 columns. Deterministic, no viewport sniffing.
4. **Rail alignment.** Ship the collision layout with connectors; verify with the dense-note fixture (6 notes in 10 lines) and the long-line case (>140 columns) at 1440 and 390, light and dark.
5. **Walkthrough at 390.** Per-step excerpts stacked, no sticky pane, step list as a horizontal scroller pinned under the header.

Design skills apply per component (impeccable critique → change → re-check; frontend-design; better-ui; emil-design-eng; DESIGN.md tokens). Colour carries meaning (added, removed, focus, tone), never decoration. Keep typography.

Done when: the fixture artifact `ui-v2/code-walkthrough-fixture` and the three real artifacts with the most code (`project-atlas/var-how-it-works`, `dotfiles/cloud-agent-box-guided-tour`, `nice-mermaid-nvim/nice-mermaid-inline-render-pipeline`, rewritten to `code` where they used `code-block`) render with no overflow at 390, notes aligned at 1440, and the call stack readable with the comment sidebar open.
