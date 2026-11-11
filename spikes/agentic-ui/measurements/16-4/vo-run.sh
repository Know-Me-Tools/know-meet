#!/bin/zsh
# Gate 16.4: runs the a11y procedures with VoiceOver on and polls VoiceOver's last phrase.
#   zsh vo-run.sh <own|hybrid> <binary> <only-list>
# Expects VoiceOver already running and the harness on KM_HARNESS_URL. Leaves VoiceOver running.
set -u
PROTO="$1"; BIN="$2"; ONLY="$3"
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/raw/voiceover/$PROTO"
mkdir -p "$OUT"
STOP="$OUT/.stop"; rm -f "$STOP"
osascript -l JavaScript "$HERE/vo-poll.js" "$OUT/vo-phrases.jsonl" "$STOP" &
POLL=$!
cd "$HERE/../../harness"
KM_HARNESS_URL=http://127.0.0.1:4327 node src/webview-driver/a11y/a11y-run.ts --binary "$BIN" --prototype "$PROTO" --out "$OUT" --only "$ONLY" 2>&1 \
  | perl -MTime::HiRes=time -ne 'printf "%d %s", time()*1000, $_; STDOUT->flush' | tee "$OUT/run.log"
touch "$STOP"; wait $POLL
echo "poller stopped"
