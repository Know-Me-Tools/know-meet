#!/bin/zsh
# Gate 16.4: keyboard-only A2UI form probe (vo-form-probe.ts) with the VoiceOver phrase poller.
#   zsh vo-form.sh <own|hybrid> <binary>
set -u
PROTO="$1"; BIN="$2"
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/raw/voiceover/$PROTO-form"
mkdir -p "$OUT"; STOP="$OUT/.stop"; rm -f "$STOP"
osascript -l JavaScript "$HERE/vo-poll.js" "$OUT/vo-phrases.jsonl" "$STOP" &
POLL=$!
cd "$HERE/../../harness"
KM_HARNESS_URL=http://127.0.0.1:4327 node src/webview-driver/a11y/vo-form-probe.ts "$BIN" "$PROTO" 2>&1 | grep -v -E 'ExperimentalWarning|trace-warnings' | tee "$OUT/run.log"
touch "$STOP"; wait $POLL
