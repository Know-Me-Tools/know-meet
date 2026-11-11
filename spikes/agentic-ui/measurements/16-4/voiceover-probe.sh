#!/bin/zsh
# Gate 16.4: automated VoiceOver pass attempt for the Tauri spike shell.
#   zsh voiceover-probe.sh <app-binary> <out-log>
# Launches the app, starts VoiceOver, presses trusted Tab keys (km-input) and after each step asks
# VoiceOver for `output of last phrase`. If VoiceOver refuses AppleScript control, the exact error is
# logged and the probe stops. VoiceOver is always turned off again (and the app killed) on exit.
set -u
APP="$1"
OUT="$2"
KM_INPUT="$(dirname "$0")/../../harness/reports/webview-driver/km-input"
log() { print -r -- "$(date +%H:%M:%S) $*" | tee -a "$OUT"; }
vo_running() { pgrep -x VoiceOver >/dev/null; }
vo_phrase() { osascript -e 'tell application "VoiceOver" to return content of last phrase' 2>&1; }
vo_off() {
  if vo_running; then
    osascript -e 'tell application "VoiceOver" to quit' >/dev/null 2>&1
    sleep 1
    vo_running && "$KM_INPUT" key 96 cmd   # Cmd+F5 toggles VoiceOver off
    sleep 2
    vo_running && killall VoiceOver 2>/dev/null
  fi
  log "voiceover running after cleanup: $(vo_running && echo yes || echo no)"
}
cleanup() { vo_off; [[ -n "${APP_PID:-}" ]] && kill "$APP_PID" 2>/dev/null; log "app stopped"; }
trap cleanup EXIT

: > "$OUT"
log "macOS $(sw_vers -productVersion); km-input $("$KM_INPUT" trusted)"
log "SCREnableAppleScript default: $(defaults read com.apple.VoiceOver4/default SCREnableAppleScript 2>&1 | tail -1)"
log "/private/var/db/Accessibility: $(ls -A /private/var/db/Accessibility 2>&1 | tr '\n' ' ')"
log "voiceover running before: $(vo_running && echo yes || echo no)"

"$APP" >/dev/null 2>&1 &
APP_PID=$!
sleep 4
log "app pid $APP_PID front: $("$KM_INPUT" front "$APP_PID")"

"$KM_INPUT" key 96 cmd   # Cmd+F5: trusted VoiceOver toggle
for _ in {1..20}; do vo_running && break; sleep 0.5; done
log "voiceover running after Cmd+F5: $(vo_running && echo yes || echo no)"
if ! vo_running; then
  /System/Library/CoreServices/VoiceOver.app/Contents/MacOS/VoiceOverStarter >/dev/null 2>&1 &
  for _ in {1..20}; do vo_running && break; sleep 0.5; done
  log "voiceover running after VoiceOverStarter: $(vo_running && echo yes || echo no)"
fi
sleep 3
log "step 0 (app focused) last phrase: $(vo_phrase)"
if vo_phrase | grep -q "execution error"; then
  log "BLOCKED: VoiceOver AppleScript control refused; stopping the probe"
  exit 0
fi
"$KM_INPUT" front "$APP_PID" >/dev/null
for i in {1..6}; do
  "$KM_INPUT" key 48
  sleep 1.5
  log "step $i (Tab) last phrase: $(vo_phrase)"
done
