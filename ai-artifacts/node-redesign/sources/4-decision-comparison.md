# Skill distribution: options and recommendation

## Source

- `/Users/iurysouza/dev/personal/tools/agents2/ai-artifacts/agent-skills-distribution/distribution-options.md`
- Dated 10 October 2026; status in source: research only, nothing changed.

## Summary

The existing copy-and-PR workflow fails its “no manual steps” goal: seven sync runs failed, consumers hold stale copies, and each change would still require twelve merges. The recommendation is one public catalog fetched at cloud boot, with pinned user-level installations on Macs and a static bootstrap line per cloud runtime.

## Goal and audience

- Change a skill once in `agent-skills`.
- Every repo on either Mac or cloud box (Cursor, Claude Code, Codex) should have current skills without manual syncing.
- Audience: Iury and his agents only.

## Current problems, ranked

1. All seven `sync-skills.yml` runs since 14 September 2026 failed because `SKILLS_SYNC_TOKEN` was never set.
2. Consumer copies came from hand-merged initial PRs and were stale: 20 skills per consumer, one outdated, three missing.
3. Even working fan-out opens one PR per repo per change; twelve PRs must be merged before fresh clones update.
4. There are three copies: source, `agents2/content/skills`, and each consumer's `.agents/skills`.
5. agents2 also installs a pinned snapshot under `~/.local/share/agents2/tools/agent-skills/<sha>/`, duplicating bytes; tests and `PROVENANCE.md` keep copies aligned.
6. Mac update is a six-step chore: push; bump `lock.json`, `catalog.md`, and `catalog-evidence.json`; re-vendor content; update provenance; test; apply/doctor. `agents2 update` mishandles git pins.
7. Consumer copies require `.agents/**` CI/lint exclusions, special overlay rules for clockwork, pi-extensions, plannotator, and visual-artifact-renderer, plus hand-maintained `consumers.yml`.
8. Cross-repo writes need a PAT or GitHub App with write access to 12 repos.

## Options and tradeoffs

| Option | Skill change with no manual step | Fresh clone current | Pi/Claude/Codex/Cursor cloud | Cross-repo write token | Maintenance |
|---|---|---|---|---|---|
| 1. Fix PR fan-out by setting token | No: twelve merges per change | Only after merge | Yes | No | Low: repo list, overlays, CI excludes |
| 2. Submodule plus symlinks and Dependabot | No: bump PR per repo | Only with `--recurse-submodules` | Yes | Yes | Medium |
| 3. Mac user-level plus cloud bootstrap from `main` | Yes | Yes, if network works at boot | Yes; one hook per cloud runtime | Yes; public read-only repo | Low; one script in catalog |
| 4. Runtime-native user sync only | Mostly | Cursor and Claude only | No Codex cloud or Pi | Yes | Low but vendor-shaped; freshness opaque |
| 5. `npx skills` or `gh skill` per box | No: installation step per box | No without hook | Yes | Yes | Low |

- Option 3 is the only option source scores as meeting all five criteria.
- Options 4 and 5 can complement option 3, not replace it.
- The MCP-server approach is a poor fit: runtimes discover skill files from disk, while skills may include scripts.

## Recommendation: stop copying, fetch at boot

- Principle: repos hold a pointer, never skill copies.
- Skills live in exactly two places: source repo and user-level directories on each box.

### Macs

- Keep user-level installation through agents2.
- Remove vendored `content/skills/` catalog copies.
- Pi/Claude/Codex adapters should read agents2's installed snapshot at `tools/agent-skills/<sha>/skills/`.
- Remove the provenance test and matching `PROVENANCE.md` section.
- Link skills into `~/.cursor/skills`; agents2 does not create it today.
- Make pin update one command: `agents2 bump agent-skills` (resolve `ls-remote HEAD`, write lock/catalog docs, apply).

### Cloud boxes

- Add `scripts/bootstrap.sh` to public `agent-skills`.
- Fetch `https://codeload.github.com/iurysza/agent-skills/tar.gz/${AGENT_SKILLS_REF:-main}`.
- Extract `skills/*` to user-level `~/.agents/skills`, `~/.cursor/skills`, `~/.claude/skills`, and `~/.codex/skills`.
- No repo skill copies means no `.gitignore`, CI exclusions, overlay rules, or drift.
- Each repo/runtime carries one fixed line that never changes when skills change:
  - Cursor: add curl line to `.cursor/environment.json` install; termscope already has `.cursor/install.sh`.
  - Claude Code cloud: `SessionStart` hook gated on `CLAUDE_CODE_REMOTE=true`.
  - Codex cloud: line in environment setup configured per Codex environment, not per repo.
  - Pi runs on Macs and is covered there.

## Minimal first step

1. Write an idempotent ~20-line `scripts/bootstrap.sh` that honors `AGENT_SKILLS_REF`.
2. Add line to termscope's existing `.cursor/install.sh`.
3. Start one Cursor Cloud agent and list its skills.
4. Verify whether Cursor Cloud discovers `~/.cursor/skills` or `~/.agents/skills` at install time.
5. If not, extract into a gitignored nested `.agents/skills/_catalog/` and test whether Cursor scans gitignored skill directories.
6. Roll the one-liner to other repos only after this test passes.

## Delete only after step 2 passes

- In agent-skills: `consumers.yml`, `sync-skills.yml`, fanout/prepare-pr modes, unused vendor action, fan-out artifact, README fan-out line, and token docs.
- Keep `vendor` mode only if something still uses it.
- In consumers: remove catalog copies and only those `.agents/**` exclusions used for catalog copies.
- Keep product-specific repo skills in clockwork, plannotator, and visual-artifact-renderer.
- In agents2: remove catalog copies, matching provenance test, and relevant `PROVENANCE.md` lines.
- Use local `gh` PRs from Iury's account; do not use a shared write token.

## Conflicts and unresolved choices

- “Always latest” conflicts with reproducibility: cloud tracks `main`, Mac pins a commit. `AGENT_SKILLS_REF` provides per-repo escape hatch.
- Pinned Macs still need a bump; tracking `main` removes the step but loses agents2's lock guarantee for this record.
- Zero files per cloud repo is not achievable with current runtime setup; a static line is the realistic minimum.
- Cloud bootstrap needs GitHub access at boot; all three runtimes permit network setup.

## Open questions

1. Macs: keep pin with one-command bump, or track `main`?
2. Is one static bootstrap line per repo acceptable, or must repos carry zero agent files?
3. Are Claude Code cloud or Codex cloud in use, or only Cursor Cloud?
4. Enable Cursor “Sync Skills for Cloud Agents” as a backup path?
5. Keep repo-local product skills? Recommendation: yes; they are not catalog skills.
