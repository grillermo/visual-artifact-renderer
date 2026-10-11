# Pi compaction design: preserve working state, reduce summarizer cost

## Sources

- `/Users/iurysouza/dev/personal/tools/pi-extensions/ai-artifacts/compaction-design/01-best-practices.md`
- `/Users/iurysouza/dev/personal/tools/pi-extensions/ai-artifacts/compaction-design/02-vendor-mechanics.md`
- `/Users/iurysouza/dev/personal/tools/pi-extensions/ai-artifacts/compaction-design/03-plan.md`
- `/Users/iurysouza/dev/personal/tools/pi-extensions/ai-artifacts/compaction-design/04-oracle-review.md`

## Summary

The design treats compaction as a working-state handoff: preserve Pi's structured summary and recent tail, keep persistent memory separate, and use Haiku 5.5 only when it fits. The proposed flow adds an input-fit check, short supplemental instructions, telemetry, and a probe-based offline evaluation before considering masking or changing the summarizer.

## Problem and decision

- The candidate plan is dated 8 October 2026 and marked draft for Iury's approval.
- Keep Haiku 5.5 as the candidate compaction model, but verify a real successful call first.
- Keep Pi's structured prompt; append only a few missing instructions.
- Add a fit check before calling Haiku because its context window is 200K.
- Measure summary quality against saved session-model summaries before expanding the design.
- Do not build normal-context masking, file re-injection, todo re-injection, or a new handoff system.

## Current Pi input and trigger

- Pi's default compaction retains 20K recent tokens and reserves 16,384 tokens.
- Its trigger is `contextTokens > contextWindow - reserveTokens`.
- Valid cuts avoid splitting tool-call/result pairs.
- The structured summary sections are Goal, Constraints & Preferences, Progress, Key Decisions, Next Steps, and Critical Context.
- Repeated compactions carry the prior summary forward.
- Split-turn compaction makes a separate prefix checkpoint, then combines it with history.
- Tool results are truncated to 2,000 characters for summary input.
- File operations contribute paths from `read`, `write`, and `edit`; the summary receives path lists, not file contents.
- The shipped extension selects a model and calls Pi's native `compact()`; it restores prior file-path lists.

## Data flow: memory and compaction

1. **Trigger:** Pi prepares a compaction when context passes its configured threshold.
2. **Prepare:** Pi identifies `messagesToSummarize`, recent `turnPrefixMessages`, prior summary, file operations, and settings.
3. **OptMem cleanup:** Its `session_before_compact` handler removes old wake messages from preparation; persistent memory is a separate mechanism.
4. **Extension ordering:** The compaction-model extension must run after pi-optmem so its input does not include the wake message.
5. **Estimate:** Proposed pure `fit.ts` estimates characters from serialized LLM messages and divides by four; it adds prior summary and about 1.5K prompt tokens.
6. **Budget:** Output allowance is `min(floor(0.8 × reserveTokens), model.maxTokens)`.
7. **Guard:** Skip Haiku if `estimate × 1.2 + outputBudget > model.contextWindow`; fallback to the session model and explain why.
8. **Summarize:** Haiku receives the prepared span and Pi's native structured prompt, plus supplemental instructions and any manual `/compact` instructions.
9. **Replace:** Pi replaces old messages with the returned summary while retaining the recent tail.
10. **Wake:** pi-optmem's context hook puts the current memory view at the start of a later request.

## Data passed between stages

| Stage | Input | Output or side effect |
|---|---|---|
| Pi preparation | Session entries, previous summary, file operations, current settings | Messages to summarize, recent prefix, metadata |
| OptMem pre-compact hook | Mutable preparation and prior wake messages | Durable memory saved; wake messages removed from summary input |
| Fit estimator (proposed) | Serialized summarizer messages, prior summary, prompt allowance | Estimated input-token count and fit result |
| Model selection | Profile model ID and provider registration | Resolved model or existing fallback |
| `compact()` | Prepared messages, prior summary, `customInstructions` | Summary text and usage metadata |
| Pi compaction | Summary text and original session state | Old span replaced; recent messages remain |
| OptMem context hook | Saved memory store | Current wake view added to a later request |

## Evidence that shaped the safeguard

- Initial plan query: 927 saved compaction entries lacked `details.compactedBy`; two report entries were provider fallbacks.
- Oracle review later corrected the initial reading: a real RPC test after commit `798a2e1` used Haiku on 103K tokens, with 45K input, a 467-token summary, and 3.1 seconds. That test wrote to `/tmp`, so a search limited to normal session files missed it.
- A live automatic compaction remained unverified in the review.
- Rebuilt summarizer input estimate: median about 55K tokens, 90th percentile about 114K, maximum about 167K across 927 records; four exceeded 150K and none exceeded 180K.
- The estimate uses 4 characters per token and is roughly ±20%; it ignores `context_edit` projection and tokenizer differences.
- Input mix estimate: 54% truncated tool results, 33% tool-call arguments, 7% assistant/user text, and 6% thinking.
- Haiku 5.5 window: 200K; output budget: 32K model max, while current summary cap is 13,107 tokens.
- The oracle review noted an observed 45K-to-467-token summary is terse; evaluation should report summary length, not demand short summaries.

## Proposed phases

### Phase 0: prove Haiku works

- Run `/compact-model`; expect `ready`.
- Run `/compact`; expect a green “used” card naming Haiku 5.5.
- Check session `details.compactedBy` and usage.
- Acceptance in the original plan: at least three real compactions, including one automatic.
- Review correction: one real RPC success already exists, but the automatic case still needs a smoke test.

### Phase 1: small safeguards

- Add the pure input-fit estimator and tests for under-limit, over-limit, split-turn, and prior-summary cases.
- Add optional `compactionModel.instructions`; default lines ask for failed approaches, last test/build command and result, unresolved exact errors, and stated user preferences.
- Merge default/configured instructions with `event.customInstructions`; do not replace Pi's prompt.
- Add `estimatedInputTokens` and `fit: "ok" | "too_large"` to details and report card.
- Document extension load order after pi-optmem.
- Configure Work Haiku only after confirming model ID, auth, and provider registration; test a real `/compact`.
- Oracle review: fit check is optional if it grows; logging real sizes first is an acceptable alternative.

### Phase 2: offline quality evaluation

- Sample 15 real compaction entries: first and repeated compactions, at least five coding sessions with edits/failing tests, and largest inputs.
- Rebuild each summarized span; skip `context_edit` sessions or accept that projection is ignored.
- Compare saved session-model summary (A) with Haiku plus instructions (B); optionally test Haiku with Pi's plain prompt (C).
- Keep the saved prior summary fixed for both arms on repeated compactions.
- Write six grounded probes per span: constraint/preference, path/symbol, error/test, failed approach, decision/reason, next step.
- Blind-grade each answer 0 (missing/wrong), 1 (partial), or 2 (exact); Iury reviews ten items.
- Original pass bar: Haiku total at least 90% of baseline and no category gets zero on three or more spans.
- Oracle review: report scores by baseline model because the 927 summaries mix GPT-5.6-sol, Opus, and other models.

### Phase 3: only if evaluation finds a problem

- If large arguments cause misses or fit checks fire often, mask only old `write.content`, `edit.oldText`, and `edit.newText` bodies to about 500 characters with a file-on-disk marker.
- Keep failed tool results and exact errors intact; clone messages so persisted entries never change.
- If masking does not fix losses, switch default to the session model or Sonnet; keep Haiku for manual compaction only.
- Remove extra instructions if probe results show they hurt.

## Tradeoffs and risks recorded

- Haiku is cheaper/faster by API pricing claims; Personal uses a Claude CLI subscription, so the practical gain is usage-limit headroom and speed, not dollar savings.
- Fit estimates may undercount dense code or JSON; use 1.2× margin and record real estimates.
- Losses can accumulate over repeated compactions; sample repeated spans.
- A flipped extension load order could include OptMem wake text in the summary.
- Evaluation sends real session spans to API providers; keep raw data local and out of git.
- Do not replace Pi's iterative structured prompt; do not clear ordinary context because cache misses and history/model mismatch outweigh unproven savings.
- Do not re-inject AGENTS.md (it remains in system prompt), file contents (agent can reread), or todos (no todo tool installed).
- Do not use 1M-window triggers with a 200K summarizer; proposed 100K reserve would create inputs too large for Haiku.
