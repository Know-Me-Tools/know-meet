#!/usr/bin/env bash
# Boundary run stage runner (web-release, contract abf8d22d…, amendment 2).
# Usage: run-stage.sh <stage-name> <step-file>
# Runs each line of <step-file> as one command, in the worktree, under the pinned
# Node. Logs every command to <evidence>/<stage>/NN.log, appends exit codes to
# <evidence>/<stage>/results.tsv, and stops at the first nonzero exit.
# Secret values are never printed by this script; commands read LIVEKIT_* from
# the environment by name only.
set -uo pipefail

STAGE="${1:?stage name}"
STEPS="${2:?step file}"
WORKTREE="/Users/gqadonis/.claude/worktrees/know-meet-web-release"
EVIDENCE="$(cd "$(dirname "$0")" && pwd)"
OUT="$EVIDENCE/$STAGE"
mkdir -p "$OUT"
: > "$OUT/results.tsv"

cd "$WORKTREE" || exit 1
export KM_EVIDENCE_DIR="$EVIDENCE"
export KM_LIVEKIT_URL="${LIVEKIT_URL:?LIVEKIT_URL must be set}"
[ -f "$EVIDENCE/run-env.sh" ] && . "$EVIDENCE/run-env.sh"

n=0
while IFS= read -r cmd || [ -n "$cmd" ]; do
  case "$cmd" in ''|'#'*) continue ;; esac
  n=$((n + 1))
  log="$(printf '%s/%02d.log' "$OUT" "$n")"
  start="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf '$ %s\n' "$cmd" > "$log"
  bash -c "$cmd" >> "$log" 2>&1
  rc=$?
  printf '%02d\t%s\t%s\t%s\n' "$n" "$rc" "$start" "$cmd" >> "$OUT/results.tsv"
  if [ "$rc" -ne 0 ]; then
    printf 'STOP: step %02d exited %s\n' "$n" "$rc" >> "$OUT/results.tsv"
    exit "$rc"
  fi
done < "$STEPS"
printf 'DONE: %s steps\n' "$n" >> "$OUT/results.tsv"
