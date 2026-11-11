#!/usr/bin/env bash
# Gate 16.3: like-for-like re-measure of H and O.
#   1. paired, interleaved, randomised runs to render-complete on the NON-PROFILING builds
#      (Chromium + Playwright WebKit, REPEATS per scenario);
#   2. a separate, clearly labelled PROFILING pass for React commit counts only;
#   3. one 30-minute long-session soak per prototype (Chromium, non-profiling build).
# Requires build-16-3.sh outputs and the harness mock server on :4317 (left running).
# Starts its own vite previews and stops them on exit.
set -euo pipefail
SPIKE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
HARNESS="$SPIKE_DIR/harness"
BUILDS="$HARNESS/reports/builds-16-3"
RAW="$SPIKE_DIR/measurements/raw/16-3"
REPEATS="${REPEATS:-12}"
PROFILING_REPEATS="${PROFILING_REPEATS:-3}"
SOAK_MINUTES="${SOAK_MINUTES:-30}"
STAGES="${STAGES:-paired profiling soak}"
mkdir -p "$RAW"
curl -sf http://127.0.0.1:4317/healthz >/dev/null || { echo "harness :4317 is not running" >&2; exit 1; }

PIDS=()
cleanup() { for pid in "${PIDS[@]}"; do pkill -P "$pid" 2>/dev/null || true; kill "$pid" 2>/dev/null || true; done; }
trap cleanup EXIT
start_preview() { # proto build port
  (cd "$SPIKE_DIR/$1" && exec pnpm exec vite preview --outDir "$BUILDS/$2" --port "$3" --strictPort --host 127.0.0.1 >/dev/null 2>&1) &
  PIDS+=("$!")
  for _ in $(seq 1 50); do curl -sf "http://127.0.0.1:$3/" >/dev/null && return 0; sleep 0.2; done
  echo "preview $2 on :$3 did not start" >&2; exit 1
}
start_preview hybrid hybrid-no-profiling 4285
start_preview own own-no-profiling 4286
start_preview hybrid hybrid-profiling 4287
start_preview own own-profiling 4288

cd "$HARNESS"
for stage in $STAGES; do
  case "$stage" in
    paired)
      node src/measure/paired-measure.ts --hybrid-url http://127.0.0.1:4285/ --own-url http://127.0.0.1:4286/ \
        --label noprof --out "$RAW" --repeats "$REPEATS" --seed 163 ;;
    profiling)
      node src/measure/paired-measure.ts --hybrid-url http://127.0.0.1:4287/ --own-url http://127.0.0.1:4288/ \
        --label profiling --out "$RAW" --repeats "$PROFILING_REPEATS" --seed 1631 \
        --scenarios a2ui-over-agui,custom-chunks,disconnect-reconnect-replay,hitl-approve,hitl-expire,hitl-reject,long-markdown,malformed-out-of-order,parallel-tool-calls,reasoning-subagents-snapshot,run-cancelled-by-agent,run-error,state-snapshot-delta,hostile/huge-table ;;
    soak)
      node src/measure/soak.ts --url http://127.0.0.1:4286/ --prototype own --out "$RAW/soak-own.json" --minutes "$SOAK_MINUTES"
      node src/measure/soak.ts --url http://127.0.0.1:4285/ --prototype hybrid --out "$RAW/soak-hybrid.json" --minutes "$SOAK_MINUTES" ;;
    *) echo "unknown stage $stage" >&2; exit 1 ;;
  esac
done
echo "done"
