#!/usr/bin/env bash
# c15 task 15.5: Tauri (macOS WKWebView) runs of prototypes H and O, plus the
# driver parity dry run in Playwright WebKit. Run sequentially, nothing else busy.
# Needs: harness on :4317 (with POST /spike-report), shells built with
#   RUSTC_WRAPPER= node ../tauri-shell/scripts/build-shell.ts <hybrid|own>
# and, for the dry run, a preview of the prototype (PREVIEW_URL_<proto>).
set -euo pipefail

SPIKE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
HARNESS="$SPIKE_DIR/harness"
RAW="$SPIKE_DIR/measurements/raw"
BIN="$SPIKE_DIR/tauri-shell/bin"
REPEATS="${REPEATS:-5}"
mkdir -p "$RAW"
cd "$HARNESS"

copy_latest() { # pattern prefix
  local f
  f=$(ls -t reports/spike-report/$1*.jsonl | head -1)
  cp "$f" "$RAW/$2$(basename "$f")"
  echo "  -> $RAW/$2$(basename "$f")"
}

for proto in ${PROTOS:-own hybrid}; do
  case "${STAGES:-conformance,measure}" in *conformance*)
    echo "== tauri conformance $proto"
    node src/webview-driver/tauri-run.ts --binary "$BIN/km-spike-$proto" --prototype "$proto" --mode conformance --timeout-min 60 || echo "conformance $proto exited non-zero"
    copy_latest "$proto-conformance-" "tauri-" ;;
  esac
done
for proto in ${PROTOS:-hybrid own}; do
  case "${STAGES:-conformance,measure}" in *measure*)
    echo "== tauri measure $proto"
    node src/webview-driver/tauri-run.ts --binary "$BIN/km-spike-$proto" --prototype "$proto" --mode measure --repeats "$REPEATS" --timeout-min 90 || echo "measure $proto exited non-zero"
    copy_latest "$proto-measure-" "tauri-" ;;
  esac
done
echo "done"
