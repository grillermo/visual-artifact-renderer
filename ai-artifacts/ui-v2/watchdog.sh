#!/usr/bin/env bash
# ui-v2 liveness check. Prints OK lines or PROBLEM lines. Read-only.
set -u
WT=/Users/iurysouza/dev/worktrees/var/ui-v2
TASKS=/var/folders/gz/ls5qpjvn75nds65z3j_2brjh0000gn/T/pi-subagents-501/Users-iurysouza-dev-personal-tools-var/01a12ace-6010-7541-ad07-90db6352923a/tasks
now=$(date +%s)
age() { echo $(( (now - $(stat -f %m "$1")) / 60 )); }

# 1. Workflow runs: the script file appears at start; the journal (.workflow.jsonl) appears once an agent settles.
latest_wf=$(ls -t "$TASKS"/wf_*.workflow.js 2>/dev/null | head -1)
if [ -n "$latest_wf" ]; then
  id=$(basename "$latest_wf" .workflow.js)
  j="$TASKS/$id.workflow.jsonl"
  if [ -f "$j" ]; then echo "workflow $id journal age $(age "$j")m, $(wc -l <"$j" | tr -d ' ') settled agents"; tail -2 "$j" | cut -c1-200
  else echo "workflow $id started $(age "$latest_wf")m ago, no agent settled yet"; fi
fi

# 2. Branch and worktree activity (newest modified tracked/untracked file, excluding QA PNGs and build output).
cd "$WT" || exit 1
echo "last commit: $(git log -1 --format='%h %cr %s')"
newest=$(git status --porcelain | awk '{print $2}' | grep -vE '\.png$|^app/\.next|^app/out|^ai-artifacts/ui-v2/(watchdog\.sh|briefs/|checkpoints/)' | while read f; do [ -e "$f" ] && stat -f '%m %N' "$f"; done | sort -rn | head -1)
if [ -n "$newest" ]; then echo "newest edit: $(( (now - ${newest%% *}) / 60 ))m ago (${newest#* })"; else echo "worktree clean"; fi
last_commit_min=$(( (now - $(git log -1 --format=%ct)) / 60 ))
edit_min=${newest:+$(( (now - ${newest%% *}) / 60 ))}
if [ "$last_commit_min" -gt 40 ] && { [ -z "${edit_min:-}" ] || [ "$edit_min" -gt 25 ]; }; then
  echo "PROBLEM: no commit for ${last_commit_min}m and no edit for ${edit_min:-inf}m on ui-v2"
fi

# 3. Publish lead pane.
lead=$(herdr pane read w9F:p1 2>/dev/null | tail -15)
echo "$lead" | grep -qiE "error|waiting on|blocked|allow\?|permission|rate limit|quota|usage limit" && { echo "PROBLEM: publish lead pane:"; echo "$lead" | grep -iE "error|waiting on|blocked|allow|permission|limit|quota" | tail -3; }
echo "$lead" | grep -qE "Working" && echo "publish lead: working" || echo "publish lead: idle"

# 4. Browser spam.
n=$(log show --last 20m --predicate 'process == "open" AND eventMessage CONTAINS "LAUNCH"' --style compact 2>/dev/null | grep -c LAUNCH)
[ "$n" -gt 0 ] && echo "PROBLEM: $n browser launches in 20m" || echo "browser launches: 0"
