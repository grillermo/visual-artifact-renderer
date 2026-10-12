# agents2 implementation plan

## Source

- `/Users/iurysouza/dev/personal/tools/agents2/docs/plan.md`
- Plan references `BRIEF.md` for scope and `docs/decisions/0001-architecture.md` for architecture.

## Summary

The plan builds agents2 in six milestones, from safety gates and core schemas through installation, rendering, lifecycle commands, services, parity, and documentation. Each slice has explicit acceptance tests, focused commits, and fresh-context review before the next slice.

## Rules for every slice

- End each slice in one or a few focused commits.
- Run `npm run check` green before each commit.
- Test every write path against a temporary root; use no module mocks.
- After each slice, a fresh-context Pi reviewer (`gpt-6-sol`, high thinking, separate pane) reviews the diff range and writes `docs/reviews/<slice>.md`.
- Lead decides on each review finding; implementation fixes accepted findings and commits before continuing.
- Roles: lead designs/drives, impl implements and gathers evidence, reviewers review.
- Measure non-test and test TypeScript lines at each milestone with `scripts/size.sh`.

## M0 — Gate and scaffold

### 0.1 Pi local-path gate

- Build a fixture package.
- List it by absolute path in a temporary `PI_CODING_AGENT_DIR` with resource filters.
- Start Pi and verify: included extension loads; excluded extension does not; skill and prompt filters work.
- Verify `settings.json` hash is unchanged and nothing is copied into the agent directory.
- Swap the symlink to another version directory and verify Pi loads the new version.
- Record evidence in `docs/gate/pi-local-path.md`.

### 0.2 Plan and ADR

- Add `docs/plan.md` and `docs/decisions/0001-architecture.md`.
- Acceptance: lead review.

### 0.3 Scaffold

- Add ESM package, Node >=22, strict TypeScript, oxlint, vendored anti-slop rules with `PROVENANCE.md`, Vitest, `npm run check`, `.gitignore`, and `docs/progress.md`.
- Acceptance: smoke-test check passes; anti-slop rules fail a known-bad fixture.
- Stop and report to supervisor after M0.

## M1 — Core model

### 1.1 Schemas

- Define lock, profile, and local schemas.
- Model dependency kinds as a discriminated union: `npm`, `git`, `release`, `cargo`, `repo`.
- Include platform keys.
- Acceptance: reject invalid inputs with path-precise errors; use table tests; derive types from schemas.

### 1.2 Catalog

- Build real `lock.json` from v1 `dependencies.json` uncommitted state.
- Include runtime extensions, Herdr plugins, MCPx manifests, Codex CLI (`@openai/codex`), and owner evidence for Claude Code/Cursor CLIs.
- `docs/catalog.md` lists every tool as managed or “not managed: reason” with evidence.
- Herdr binary remains unmanaged per ADR 0002.
- Acceptance: lock validates, every v1 dependency is accounted for, and no `latest` appears.

### 1.3 Profiles

- Create `profiles/personal.json`, `profiles/work.json`, and `local.example.json` from v1 examples and live state.
- Acceptance: both profiles validate; secrets appear only as references.

### 1.4 Effects core

- Define effects: `mkdir`, `writeFile`, `symlink`, `rename`, `remove`, `exec`.
- Separate planner from executor.
- Enforce canonical paths, protected directories, and targets inside the configured root.
- Acceptance: temp-root tests refuse home, ancestors, `home/.pi`, protected dirs, symlinked roots into protected dirs, and `..`/symlink escapes.

## M2 — Installer with immutable version directories

### 2.1 Staging and activate

- Stage at `tools/.staging/<id>-<rand>`, verify, rename to `tools/<id>/<version>`.
- Create bin symlinks and retain N prior versions.
- Acceptance: crash mid-install leaves no partial version directory; rerun is a no-op.

### 2.2 `npm` and `repo` kinds

- Install npm packages into staging with exact version and `--ignore-scripts` unless declared.
- Package root is `node_modules/<name>` per ADR 0001.
- `repo` copies content-hashed snapshots and never links.
- Acceptance: Pi and package install in temp root; real Pi loads staged npm package by rendered package root; Pi support libraries stay coupled; editing repo source does not alter installed version.

### 2.3 `git`, `release`, `cargo` kinds

- Clone git at SHA; download release, verify SHA-256, extract; build cargo at SHA.
- Acceptance: checksum mismatch fails and leaves nothing; Clockwork sandbox build is slow and opt-in.

## M3 — Render and apply

### 3.1 Bundle and pointer

- First gather evidence for each runtime's config writes (in-place or rename) and symlink behavior.
- Render each profile to `bundles/<profile>-<hash>`, merge unowned fields, and switch `current` atomically.
- Acceptance: switching profile changes no tool dirs; preserves unowned fields; replaced links are restored.

### 3.2 Pi adapter

- Render managed `settings.json` fields, local-path packages and allowlists, repo-only extensions, prompts, themes, roles, aliases, and skills.
- Acceptance: sandbox Pi starts with every extension in both profiles.

### 3.3 Codex adapter

- Render `AGENTS.md`, skills, and `config.toml` MCP servers; preserve auth and other keys.
- Acceptance: TOML parses and unowned keys remain.

### 3.4 Other adapters

- Add one module each for native Claude Code, OpenCode, Cursor, and Herdr.
- Herdr renders `config.toml` and identities from payload plus local overrides (review 3.0-fixes F1).
- Acceptance: config validates by schema or CLI dry check.

### 3.5 Apply command

- Dry run is default; `--yes` executes; output a clear diff.
- Acceptance: end-to-end apply of both profiles into a temp root.

## M4 — Lifecycle

- **4.1 `update <tool>`:** resolve newest version by kind; major bump needs `--major`; install and write lock. Test local npm registry fixture or `file:` tarballs.
- **4.2 `update --all`:** handle one tool at a time; stop on first failure; keep earlier successes. Inject failure in test.
- **4.3 `rollback`:** repoint to retained version and restore lock record. Test round trip.
- **4.4 `tool add`/`remove`:** edit lock and profile only. Add then remove must leave both byte-identical.

## M5 — Doctor and services

- **5.1 `doctor`:** read-only checks for PATH resolution, shadowing, versions, checksums, and rendered-config drift. Shadowing fixture fails unless declared; test that doctor writes nothing.
- **5.2 `service`:** render launchd plists and systemd user units for `local-web-gateway`, `opencode-web`, `cursor-worker`, Clockwork, and needed Herdr toolbox pieces. Never start services. Golden tests per platform; run `plutil -lint` on plists.
- **5.3 Herdr toolbox:** render config, Mosaic plugin, helpers, and pinned plugin sources into sandbox; match v1 intent.

## M6 — Parity and docs

- **6.1 Parity report:** render both profiles and diff read-only against `~/.local/state/agents/active/`, Pi settings, `~/.codex/`, and `~/.config/opencode/`; explain every difference in `docs/parity.md`.
- **6.2 Sandbox run:** exercise add/remove/update/update-all/rollback; record transcript.
- **6.3 Docs:** write fresh-machine, adopt, upgrade, and profile guides; review them.
- **6.4 Cutover plan:** write but do not execute; require supervisor sign-off.

## Open questions and risks

- Pi local-path loading gate can force an install-layout change.
- Private git packages (`pi-extensions`, `pi-claude-code`) require GitHub auth on every machine.
- OpenCode currently uses a curl installer and needs a `release` or `npm` record.
- Visual Artifact release archives place renderer files beside the CLI; `release` must retain the full extracted tree.
