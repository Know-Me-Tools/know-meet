#!/usr/bin/env bash
# Start Know Meet Live: loads LiveKit credentials from ~/.bash_profile, then runs the local server.
#   ./docs/design/live/start.sh            -> http://localhost:5173
#   PORT=8080 ./docs/design/live/start.sh  -> another port
#   HOST=0.0.0.0 ./docs/design/live/start.sh -> reachable on your network (camera/mic then need HTTPS; see README)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -z "${LIVEKIT_URL:-}" || -z "${LIVEKIT_API_KEY:-}" || -z "${LIVEKIT_API_SECRET:-}" ]]; then
  if [[ -f "$HOME/.bash_profile" ]]; then
    # shellcheck disable=SC1091
    set +u; source "$HOME/.bash_profile" >/dev/null 2>&1 || true; set -u
  fi
fi

for v in LIVEKIT_URL LIVEKIT_API_KEY LIVEKIT_API_SECRET; do
  if [[ -z "${!v:-}" ]]; then
    echo "Missing $v. Export it or add it to ~/.bash_profile, then run this again." >&2
    exit 1
  fi
done

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18 or newer is required (https://nodejs.org)." >&2
  exit 1
fi

exec node "$HERE/server.mjs"
