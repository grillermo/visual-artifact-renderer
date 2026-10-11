# agents2: what changed this week

## Source

- `/Users/iurysouza/.agents/skills/visual-artifact/artifacts/agents2/agents2-week-2026-10-04/artifact.json`
- Source artifact date range: 4–10 October 2026.

## Summary

agents2 moved from a Pi setup that works to a named-agent team, with memory-aware compaction, broader skill distribution, and separate personal/work profiles. Most remaining work fixed silent toolchain failures; Herdr theme ownership and several profile or cloud tasks remained open.

## Scope

- agents2 is a private repo that builds Pi and other agent tools on each Mac from shared profiles.
- The weekly report groups work into six themes: long sessions, named agents, skill distribution, profiles, toolchain reliability, and Herdr themes.
- The report includes five fixed defects and six open loops.

## 1. Long sessions that remember

- Compaction uses a cheaper model; memory is saved before old messages are replaced.
- A single-line OptMem memory can survive sessions, compactions, and model changes.
- Personal profile selects Haiku 5.5 for compaction and follow-up suggestions.
- The summary limit was raised so Haiku does not fall back to Opus.
- OptMem is installed and enabled in both profiles.

### Data flow shown in the source diagram

1. Pi session reaches 70% context.
2. Pi asks OptMem to save durable facts first.
3. OptMem saves in the background and returns to the Pi session.
4. Pi asks the compaction model to compact the messages.
5. The compaction model removes the memory wake message.
6. Haiku 5.5 summarizes up to 24K tokens.
7. The summary replaces old messages.
8. A later session receives the OptMem wake view with memories.

## 2. A team of named agents

- Pi's built-in agents are off; seven repository roles replace them.
- Roles: `lead`, `coder`, `reviewer`, `oracle`, `researcher`, `scribe`, and `qa`.
- Agent files do not name models; profiles map aliases to roles at apply time.
- Personal and work profiles can run the same roles on different models.
- Apply stops with a clear message when a role lacks a model alias.
- Saved workflows include `plan` and `build` scripts.
- An install script copies workflows because Pi's loader ignores symlinks.
- `/spawn-lead` creates a Herdr workspace with one lead in its own git worktree.
- The lead delegates work to coder/reviewer roles; build uses coder, reviews run one at a time.

## 3. Skills reach every runtime

- The prior PR fan-out copied skills to repos, but never ran.
- The new path pins the public `agent-skills` catalog in agents2.
- agents2 links the pinned catalog into Pi and `~/.cursor/skills`.
- Cursor skill sync carries `~/.cursor/skills` to Cursor cloud agents.
- `bootstrap.sh` fetches catalog skills for other cloud boxes.
- New skills: `tailnet-expose`, `article-explainer`, `work-inventory`, `spawn-lead`, and the latest `frontend-design`.
- `agent-browser` gained usage guides.
- The `visual-artifact` skill had failed to load because it lived at `skill/`, not `skills/`.

## 4. Home and work profiles

### Personal

- Claude Code models; Haiku for compaction and follow-ups.
- Cursor cloud agents enabled.
- `pi-topology-studio` enabled.
- Shared `mcp.json` has no work servers.

### Work

- Six model aliases mirror personal aliases through GitHub Copilot and Cursor.
- Work-only skills and MCP servers were ported from v1.
- Work has its own `mcp.work.json` override.
- Cloudflare and context7 MCP servers were dropped.

## 5. A toolchain that stops lying

The extension update path ran about twenty times during the week:

1. Commit to `pi-extensions`, pushed to `main`.
2. Pin commit in agents2 `lock.json` and catalog.
3. Apply installs it into the tools directory.
4. Doctor verifies hashes.
5. Start a fresh Pi session.

| Problem | What happened | Fix | State |
|---|---|---|---|
| Lock names | Update wrote `-deps` locks; catalog expects `-lock`; apply refused replacement. | Update now uses `-lock`. | Fixed |
| Release tags | Plannotator was locked as `v0.28.10`, unlike npm siblings. | Drop the `v`. | Fixed |
| Settings | Undefined compaction fields were written to `settings.json`. | Drop undefined fields first. | Fixed |
| Doctor | Check details were built eagerly. | Build details only when needed. | Fixed |
| Pi 1.0.4 | New Pi version introduced a new tool-card API. | Pin and apply the new version. | Fixed |

## 6. Herdr themes

- Mosaic colors each Herdr space by changing Herdr's theme.
- agents2 had been undoing the tint.
- `config.toml` is now merged rather than wholly overwritten.
- Mosaic owns `[theme.custom]`.
- agents2 still writes `ui.accent` as blue; this can freeze the tint again.

## Open loops

| Item | State | Detail |
|---|---|---|
| Herdr `ui.accent` | Warn | Remove it from agents2 base config so apply stops freezing Mosaic tint. |
| Two Herdr sessions | Warn | Default and list sessions overwrite each other's theme keys. |
| agents2 update | Warn | Updating git-pinned tools keeps a stale lockfile hash. |
| Follow-up prompt | Pending | Draft that predicts the next decision awaits addition to the personal profile. |
| Picker work | Pending | `/` and `#` pickers are uncommitted; pi-subagents fork branch is not pushed. |
| Work Mac | Pending | Profile changes have not been applied or checked there. |
