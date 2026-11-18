#!/usr/bin/env bash
# Stage F: production endpoint check, served LiveKit URL check, and the reduced hosted run at
# https://meet.know-me.tools (amendment 3: WR-1, WR-2, WR-3, WR-5; negative controls excluded,
# which run only in the packaged project). Run under the pinned Node from the operator's shell.
set -uo pipefail

WORKTREE="/Users/gqadonis/.claude/worktrees/know-meet-web-release"
EVIDENCE="$(cd "$(dirname "$0")" && pwd)"
OUT="$EVIDENCE/f-hosted"
mkdir -p "$OUT"
: > "$OUT/results.tsv"
cd "$WORKTREE" || exit 1

step() { # step <n> <command>
  local n="$1" cmd="$2" log
  log="$(printf '%s/%02d.log' "$OUT" "$n")"
  printf '$ %s\n' "$cmd" > "$log"
  bash -c "$cmd" >> "$log" 2>&1
  local rc=$?
  printf '%02d\t%s\t%s\t%s\n' "$n" "$rc" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$cmd" >> "$OUT/results.tsv"
  return "$rc"
}

step 1 "node tooling/release/src/verify-endpoint.ts --host meet.know-me.tools --csp-file apps/web/dist-hosted-csp.txt --json \"$EVIDENCE/verify-endpoint.json\"" || exit 1
step 2 "$EVIDENCE/check-livekit-url.sh served" || exit 1

RUN_DIR="$EVIDENCE/playwright-hosted-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$RUN_DIR"
export KM_EVIDENCE_DIR="$RUN_DIR"
export KM_RELEASE_CSP_FILE="$WORKTREE/apps/web/dist-hosted-csp.txt"
export KM_RELEASE_TOKEN_TTL_SECONDS=600 KM_RELEASE_RATE_LIMIT_BURST=10 KM_RELEASE_RATE_LIMIT_REFILL_SECONDS=60
step 3 "pnpm --filter @know-meet/release-tests exec playwright test --project=hosted --grep \"@WR-1|@WR-2|@WR-3|@WR-5\" --grep-invert \"@negative-control\""
