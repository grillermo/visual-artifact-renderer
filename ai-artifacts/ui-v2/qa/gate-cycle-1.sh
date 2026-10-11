#!/usr/bin/env bash
set -euo pipefail
export VISUAL_ARTIFACT_OPEN=0
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
cd "$ROOT/shared"
bun run build
# pnpm's injected file dependency can miss new outputs or retain copied files.
# Restore its normal hardlinks, but never write into another worktree's package.
RUNTIME=$(cd "$ROOT/app/node_modules/@agents/visual-artifact-annotations/dist" && pwd -P)
case "$RUNTIME" in "$ROOT"/*) ;; *) printf 'Shared runtime leaves this worktree: %s\n' "$RUNTIME" >&2; exit 1 ;; esac
for output in "$ROOT"/shared/dist/*.js "$ROOT"/shared/dist/*.d.ts; do
  target="$RUNTIME/${output##*/}"
  if [[ ! "$output" -ef "$target" ]]; then ln -f "$output" "$target"; fi
done
cd ../app
pnpm lint
npx tsc --noEmit
pnpm test
pnpm export:contract
pnpm build
cd ../cli
bun test
