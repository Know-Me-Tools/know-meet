#!/usr/bin/env bash
# LiveKit URL consistency check (code review H1, 2026-11-16). Every place the public LiveKit
# URL appears must equal LIVEKIT_URL in the operator's shell. Values are compared, never printed.
#
# Usage: check-livekit-url.sh local     repo variable, build CSP file, committed Gateway header
#        check-livekit-url.sh cluster   the cluster Secret's LIVEKIT_URL (run after the operator creates it)
#        check-livekit-url.sh served    meta CSP in the served index.html equals the CSP response header
set -uo pipefail

WORKTREE="/Users/gqadonis/.claude/worktrees/know-meet-web-release"
CTX="gke_knowme-corporate_us-south1_main"
HOST="meet.know-me.tools"
: "${LIVEKIT_URL:?LIVEKIT_URL must be set in this shell}"
WSS="$LIVEKIT_URL"
HTTPS="https://${LIVEKIT_URL#wss://}"
fail=0
check() { # check <name> <0|1>
  if [ "$2" -eq 0 ]; then printf 'PASS %s\n' "$1"; else printf 'FAIL %s\n' "$1"; fail=1; fi
}
contains() { grep -F -q -- "$2" "$1"; }

case "${1:-}" in
  local)
    cd "$WORKTREE" || exit 2
    [ "$(gh variable get KM_LIVEKIT_URL 2>/dev/null)" = "$WSS" ]; check "repository variable KM_LIVEKIT_URL equals shell LIVEKIT_URL" $?
    csp="apps/web/dist-hosted-csp.txt"
    { contains "$csp" "$WSS" && contains "$csp" "$HTTPS"; }; check "build CSP file names the shell LiveKit host (wss and https)" $?
    hdr="infra/k8s/overlays/production/security-headers.yaml"
    { contains "$hdr" "$WSS" && contains "$hdr" "$HTTPS"; }; check "committed Gateway CSP header names the shell LiveKit host" $?
    n="$(grep -o -E 'wss://[A-Za-z0-9.-]+' "$hdr" | sort -u | wc -l | tr -d ' ')"
    [ "$n" = "1" ]; check "Gateway CSP header names exactly one wss host" $?
    ;;
  cluster)
    secret="$(kubectl --context "$CTX" -n know-meet get secret know-meet-livekit -o jsonpath='{.data.LIVEKIT_URL}' | base64 -d)"
    [ "$secret" = "$WSS" ]; check "cluster Secret LIVEKIT_URL equals shell LIVEKIT_URL" $?
    secret=""
    ;;
  served)
    page="$(curl -fsS "https://$HOST/")" || { echo "FAIL could not fetch https://$HOST/"; exit 1; }
    header="$(curl -fsS -D - -o /dev/null "https://$HOST/" | tr -d '\r' | sed -n 's/^[Cc]ontent-[Ss]ecurity-[Pp]olicy: //p')"
    meta="$(printf '%s' "$page" | sed -n 's/.*http-equiv="Content-Security-Policy" content="\([^"]*\)".*/\1/p' | sed 's/&#39;/'"'"'/g; s/&quot;/"/g; s/&amp;/\&/g')"
    [ -n "$meta" ]; check "served index.html carries a meta CSP" $?
    printf '%s' "$header" | grep -F -q -- "$WSS"; check "served CSP header names the shell LiveKit host" $?
    printf '%s' "$meta" | grep -F -q -- "$WSS"; check "served meta CSP names the shell LiveKit host" $?
    ;;
  *) echo "usage: $0 local|cluster|served"; exit 2 ;;
esac
exit "$fail"
