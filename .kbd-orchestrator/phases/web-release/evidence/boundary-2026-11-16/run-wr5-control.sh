#!/usr/bin/env bash
# Re-run of the one packaged scenario that failed on the harness, not the product:
# WR-5 negative control. In the full run the preview server could not bind port 4173
# (already in use at that moment), so the control's target refused connections.
# Same build, same preview command, same test; only this test is selected.
set -uo pipefail
WORKTREE="/Users/gqadonis/.claude/worktrees/know-meet-web-release"
EVIDENCE="$(cd "$(dirname "$0")" && pwd)"
OUT="$EVIDENCE/c-packaged-wr5-rerun"
mkdir -p "$OUT"
cd "$WORKTREE" || exit 1

pnpm --filter @know-meet/web preview --host 127.0.0.1 --port 4173 --strictPort > "$OUT/preview.log" 2>&1 &
PREVIEW_PID=$!
trap 'kill "$PREVIEW_PID" 2>/dev/null' EXIT
for _ in $(seq 1 60); do
  curl -fsS -o /dev/null http://127.0.0.1:4173/ && break
  sleep 1
done
kill -0 "$PREVIEW_PID" 2>/dev/null || { echo "preview did not start"; cat "$OUT/preview.log"; exit 1; }

RUN_DIR="$EVIDENCE/playwright-packaged-wr5-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$RUN_DIR"
export KM_EVIDENCE_DIR="$RUN_DIR"
export KM_RELEASE_BASE_URL="http://localhost:18080"
export KM_RELEASE_DEFAULT_BUILD_URL="http://127.0.0.1:4173"
pnpm --filter @know-meet/release-tests exec playwright test --project=packaged \
  --grep "the same checks fail on the default build" > "$OUT/playwright.log" 2>&1
rc=$?
tail -5 "$OUT/playwright.log"
exit "$rc"
