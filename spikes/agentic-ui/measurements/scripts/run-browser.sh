#!/usr/bin/env bash
# c15 task 15.5: head-to-head browser measurement of prototypes H and O.
# Serves each Vite production dist with its own `pnpm preview`, runs the harness
# measure script (same scenarios, repeats and pacing for both) in Chromium and
# WebKit, copies the raw reports to measurements/raw/ and stops the previews.
# Requires the harness mock server on :4317 (left running).
set -euo pipefail

SPIKE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
HARNESS="$SPIKE_DIR/harness"
RAW="$SPIKE_DIR/measurements/raw"
REPEATS="${REPEATS:-5}"
SCENARIOS="a2ui-over-agui,cancel-mid-stream,custom-chunks,disconnect-reconnect-replay,hitl-approve,hitl-expire,hitl-reject,long-markdown,malformed-out-of-order,parallel-tool-calls,reasoning-subagents-snapshot,run-cancelled-by-agent,run-error,state-snapshot-delta,hostile/huge-table"
mkdir -p "$RAW"

curl -sf http://127.0.0.1:4317/healthz >/dev/null || { echo "harness :4317 is not running" >&2; exit 1; }

PIDS=()
cleanup() { for pid in "${PIDS[@]}"; do kill "$pid" 2>/dev/null || true; done; }
trap cleanup EXIT

start_preview() { # dir port
  (cd "$SPIKE_DIR/$1" && exec pnpm exec vite preview --port "$2" --strictPort --host 127.0.0.1 >/dev/null 2>&1) &
  PIDS+=("$!")
  for _ in $(seq 1 50); do curl -sf "http://127.0.0.1:$2/" >/dev/null && return 0; sleep 0.2; done
  echo "preview $1 on :$2 did not start" >&2; exit 1
}

start_preview hybrid 4175
start_preview own 4173

for browser in chromium webkit; do
  for proto in hybrid own; do
    port=4175; [ "$proto" = own ] && port=4173
    label="$proto-$browser"
    echo "== $label"
    (cd "$HARNESS" && node src/measure/measure.ts --url "http://127.0.0.1:$port/" --prototype "$label" \
      --dist "../$proto/dist" --scenarios "$SCENARIOS" --repeats "$REPEATS" --browser "$browser") || echo "measure $label exited non-zero" >&2
    cp "$HARNESS/reports/measure-$label.json" "$RAW/browser-measure-$label.json"
  done
done
echo "done"
