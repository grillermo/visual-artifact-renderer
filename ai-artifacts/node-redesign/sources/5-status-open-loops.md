# Tool UI inventory: coverage, known gaps, and next steps

## Sources

- `/Users/iurysouza/dev/personal/tools/agents2/ai-artifacts/tool-ui-inventory/README.md`
- `/Users/iurysouza/dev/personal/tools/agents2/ai-artifacts/tool-ui-inventory/providers.md`
- `/Users/iurysouza/dev/personal/tools/agents2/ai-artifacts/tool-ui-inventory/tool-list.md`

## Summary

This is a read-only snapshot of Pi's callable-tool renderers, grouped by shared renderer family rather than designing 113 tools separately. It records hook coverage and inspection gaps, but makes no claim of visual compliance; the existing subagent patch remains absent and no renderer changes or visual tests were performed.

## Snapshot and scope

- Inspected 6 October 2026; installed Pi version `1.0.0`.
- agents2 revision: `dceaa3f`; pi-extensions revision: `6f66e2a`.
- Snapshot uses this session's `ALL_TOOLS`, installed extension selections, and renderer source.
- It is not a complete `pi.getAllTools()` dump; deferred, hidden, disconnected, model-only, and later-registered tools may differ.
- Current session listed 119 callable tools through codemode; directly exposed `codemode` adds one, for 120 observed names.
- Seven tools use the shared compact `tool-presentation` renderer.
- 104 tools have both call and result hooks; 2 have result-only hooks; 14 have neither.
- All 88 MCP tools share one host renderer; custom hooks do not imply consistent styling.

## Group counts

| Group | Listed callable tools |
|---|---:|
| Built-ins and local extensions | 28 |
| Notion MCP | 46 |
| Cloudflare bindings MCP | 23 |
| Cloudflare observability MCP | 8 |
| Cloudflare builds MCP | 6 |
| Cloudflare docs MCP | 2 |
| Cloudflare MCP | 3 |
| MCP resource helpers | 3 |
| Total in captured list | 119 |
| Direct codemode tool | +1 |
| Observed names | 120 |

## Renderer-family status

| Tool family / owner | Tools | Call hook | Result hook | State or review cases |
|---|---|---|---|---|
| Shared tool-presentation | `read`, `write`, `edit`, `bash`, `grep`, `find`, `ls` | Custom | Custom | Compact modes, diffs, timing, replay; needs representative cases per tool. |
| pi-subagents | `Agent`, `SubagentWorkflow` | Custom | Custom | Launch, running progress, completion, failure, background work, workflow stages. |
| pi-subagents | `get_subagent_result`, `steer_subagent` | Fallback | Fallback | Waiting, running, complete, missing, queued steering, already finished. |
| pi-ask-user | `ask_user` | Custom | Custom | Waiting, answered, cancelled, error, interactive prompt. |
| pi-web-access | `web_search`, `fetch_content`, `get_search_content` | Custom | Custom | Search, fetch, retrieval, images, partial results, links, errors. |
| pi-web-access | `source_check` | Fallback | Fallback | Structured evidence, citations, provider failures. |
| pi-add-dir | `add_directory`, `search_external_files` | Custom | Custom | Added directory, reload, matches, empty search, failure. |
| pi-wtf | `wtf` | Fallback | Fallback | Recorded note or failure. |
| session-query | `session_query` | Fallback | Custom result only | Loading, response, failure. |
| session-store | `search_sessions` | Fallback | Custom result only | Markdown results, no matches, failure. |
| handoff | `handoff` | Fallback | Fallback | Started or failed. |
| pi-optmem | `memo_note`, `memo_nap`, `memo_zoom`, `memo_recall` | Fallback | Fallback | Saved memory, compression, expansion, search, errors. |
| visual-artifact | `choose_visual_artifact_direction`, `create_visual_artifact` | Fallback | Fallback | Selected direction, cancel, unavailable UI, validation failure, URL. |
| Pi codemode | `codemode` | Custom | Custom | Preview, nested calls, cost, partial progress, failure, cancel, truncation. |
| Pi MCP host | All 88 `mcp__*` names | Custom | Custom | Server label, JSON/text/resources/images, remote failure, saved output. |
| Pi MCP resources | `list_mcp_resources`, `list_mcp_resource_templates`, `read_mcp_resource` | Fallback | Fallback | Listings, pagination, empty lists, partial failure, text/image. |

## Existing state and unresolved loops

- A two-line compact patch exists in the repo for `get_subagent_result` and `steer_subagent`.
- Installed source has no hooks for those tools; read-only status command returned `not applied`.
- The patch is version-pinned; agents2 package replacement removes it. This is a documented failure mode, not a proven reason it is absent.
- No patch was applied during inventory.
- Tests for `tool-presentation` were inspected, not run.
- No visual standard or compliance manifest currently governs the inventory.
- A custom renderer is not automatically compliant; a shared fallback is not automatically wrong.
- No visual test or tool execution generated these findings.
- Settings select `tokyo-night`; no `pi-tidy-tools.json` or `PI_TIDY_TOOLS` override was present in inspection process.
- Source defaults enable tidy, icons, and two-line layout; this does not prove live process has no in-memory changes.

## Review matrix: finite representative states

| Dimension | Cases to cover |
|---|---|
| Execution | Arguments arriving, ready, running, partial result, success, error, cancellation, blocked call. |
| Disclosure | Collapsed, expanded, hidden or empty output. |
| Content | Empty, short/long text, JSON, Markdown, diff, image, mixed content, links, structured data. |
| Boundaries | Missing details, legacy result, malformed details, renderer exception, truncation with saved output path. |
| Layout | Narrow/wide terminals, wrapping, long paths, Unicode, Nerd Font present/absent. |
| Appearance | Current theme, light theme, theme switch, icons off. |
| Composition | Direct call, nested codemode call, concurrency, background completion, resumed session. |
| Interaction | Prompt answered/dismissed/timed out, UI unavailable, notification, overlay, widget. |

- These are review cases, not a claim that every tool implements every state.
- Cancellation and denial may arrive as ordinary error results.

## Important renderer behavior

- Shared built-in compact card shows intent, target, result summary, duration; minute dividers group calls.
- Expansion reveals text or rich diff; running calls show pending mark and elapsed time; errors retain target.
- Cursor replay uses result mode and avoids treating playback time as execution time.
- Pi generic fallback uses up to 10 text lines when collapsed and all text when expanded; Pi supplies pending/success/error backgrounds.
- Inline image handling is a separate path; missing tool definitions also need examples for old sessions.
- Nested tools callable through codemode may appear only as nested rows, not top-level renderer cards.
- Codemode shows up to 10 visual source lines, last 8 nested calls, and 5 visual output lines collapsed; expanded mode shows all recorded calls and full arguments.
- MCP renderer shows `server/tool` and arguments; collapsed output is limited to 5 visual lines, with saved full-output path visible.
- `pi.getAllTools()` exposes names, schemas, exposure, namespace, annotations, and source, but not renderer hooks; discovery alone cannot certify rendering coverage.

## Next-step options

1. Add a fixture catalogue beside existing `tool-presentation` tests.
2. Use synthetic results and real renderer functions; do not call destructive/external tools for screenshots.
3. Later compare registered names with a manifest of owner, renderer family, required fixtures, and review status.
4. Mark new names unreviewed; trigger fixture review on package or renderer changes even when names stay the same.
5. Ask renderer owners to provide metadata, or integrate deliberately to expose definitions.
6. Extend shared presentation helpers rather than adding one extension per tool.
7. Keep specialized views for diffs, questions, agent progress, and images.
8. Standardize compact header, status, spacing, error visibility, and expansion first.
9. Keep model-facing results unchanged; presentation stays separate from execution and returned data.
