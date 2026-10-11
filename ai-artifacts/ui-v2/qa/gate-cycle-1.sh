#!/usr/bin/env bash
set -euo pipefail
export VISUAL_ARTIFACT_OPEN=0
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
cd "$ROOT/shared"
bun run build
cd ../app
pnpm lint
npx tsc --noEmit
pnpm test
pnpm export:contract
pnpm build
cd ../cli
bun test
