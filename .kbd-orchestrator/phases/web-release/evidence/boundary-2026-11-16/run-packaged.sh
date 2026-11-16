#!/usr/bin/env bash
# Stage C of the boundary run (contract commands 12-16): compose up, default build,
# preview in the background, packaged Playwright run, compose down.
# Run under the pinned Node. LIVEKIT_* come from the shell by name; never printed.
set -uo pipefail

WORKTREE="/Users/gqadonis/.claude/worktrees/know-meet-web-release"
EVIDENCE="$(cd "$(dirname "$0")" && pwd)"
OUT="$EVIDENCE/c-packaged"
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

PREVIEW_PID=""
cleanup() {
  [ -n "$PREVIEW_PID" ] && kill "$PREVIEW_PID" 2>/dev/null
  step 99 "$COMPOSE down" || true
}
trap cleanup EXIT

export KM_LIVEKIT_URL="${LIVEKIT_URL:?LIVEKIT_URL must be set}"
# Host ports 18080/18081 (operator decision 2026-11-16); see compose.ports-override.yaml.
export KM_SITE_ORIGIN="http://localhost:18080"
# The release suite creates about 21 meetings from one address. Meeting-creation limits are relaxed
# for the packaged run only; the production defaults are covered by services/livekit/tests/abuse_controls.rs.
export KM_MEETING_RATE_LIMIT_BURST=1000 KM_MEETING_RATE_LIMIT_REFILL_SECONDS=1 KM_MAX_CODES_PER_CLIENT=1000
COMPOSE="docker compose -f tooling/release/compose.yaml -f /Users/gqadonis/Projects/know-me/know-meet/.kbd-orchestrator/phases/web-release/evidence/boundary-2026-11-16/compose.ports-override.yaml"
step 1 "$COMPOSE up -d --wait" || exit 1
step 2 "pnpm --filter @know-meet/web run build" || exit 1

# The preview runs in the background only for the packaged run.
pnpm --filter @know-meet/web preview --host 127.0.0.1 --port 4173 --strictPort > "$OUT/03-preview.log" 2>&1 &
PREVIEW_PID=$!
printf '03\tbg\t%s\tpnpm --filter @know-meet/web preview --host 127.0.0.1 --port 4173 --strictPort\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$OUT/results.tsv"
for _ in $(seq 1 60); do
  curl -fsS -o /dev/null http://127.0.0.1:4173/ && break
  sleep 1
done

RUN_DIR="$EVIDENCE/playwright-packaged-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$RUN_DIR"
export KM_EVIDENCE_DIR="$RUN_DIR"
export KM_RELEASE_BASE_URL="http://localhost:18080"
export KM_RELEASE_STATIC_URL="http://127.0.0.1:18081"
export KM_RELEASE_DEFAULT_BUILD_URL="http://127.0.0.1:4173"
export KM_RELEASE_CSP_FILE="$WORKTREE/apps/web/dist-hosted-csp.txt"
export KM_RELEASE_TOKEN_TTL_SECONDS="${KM_TOKEN_TTL_SECONDS:-600}"
export KM_RELEASE_RATE_LIMIT_BURST="${KM_RATE_LIMIT_BURST:-10}"
export KM_RELEASE_RATE_LIMIT_REFILL_SECONDS="${KM_RATE_LIMIT_REFILL_SECONDS:-60}"
KM_RELEASE_IMAGE_DIGESTS="$(docker image inspect --format '{{.Id}}' know-meet-web:boundary know-meet-livekit:boundary | paste -sd, -)"
export KM_RELEASE_IMAGE_DIGESTS
printf 'tested_commit=%s\nimage_ids=%s\n' "$(git rev-parse HEAD)" "$KM_RELEASE_IMAGE_DIGESTS" > "$RUN_DIR/run-inputs.txt"

step 4 "pnpm --filter @know-meet/release-tests exec playwright test --project=packaged"
rc=$?
exit "$rc"
