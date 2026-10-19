#!/usr/bin/env bash
# Publish the Know Meet prototype + design docs to IPFS and point the
# "know-meet" IPNS name at the new version.
#
# Credentials come from the environment only — never commit them:
#   export IPFS_RPC_USER=...   IPFS_RPC_PASS=...
# Optional:
#   IPFS_RPC   (default https://console.prometheusags.ai/api/v0)
#   IPNS_KEY   (default know-meet)
#   GATEWAY    (default https://ipfs.prometheusags.ai)
set -euo pipefail
: "${IPFS_RPC_USER:?set IPFS_RPC_USER}"; : "${IPFS_RPC_PASS:?set IPFS_RPC_PASS}"
RPC="${IPFS_RPC:-https://console.prometheusags.ai/api/v0}"
KEY="${IPNS_KEY:-know-meet}"
GW="${GATEWAY:-https://ipfs.prometheusags.ai}"
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# What gets published: the prototype pages, shared assets, and docs/design.
# (Portable to macOS bash 3.2: no mapfile.)
FILES=()
while IFS= read -r f; do FILES+=("$f"); done < <(find . -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' -o -name '*.svg' -o -name '*.png' -o -name '*.json' -o -name '*.md' -o -name '*.sh' \) \
  -not -path './.*' -not -path '*/.*' -not -name '*.artifact.json' | sed 's#^\./##' | sort)
DIRS=()
while IFS= read -r d; do [ -n "$d" ] && DIRS+=("$d"); done < <(printf '%s\n' "${FILES[@]}" | while IFS= read -r f; do dirname "$f"; done | grep -v '^\.$' | awk -F/ '{p=""; for(i=1;i<=NF;i++){p=(p?p"/":"")$i; print p}}' | sort -u)

ARGS=(-F "file=@/dev/null;filename=site;type=application/x-directory")
for d in "${DIRS[@]}"; do ARGS+=(-F "file=@/dev/null;filename=site/$d;type=application/x-directory"); done
for f in "${FILES[@]}"; do ARGS+=(-F "file=@$f;filename=site/$f"); done

echo "Uploading ${#FILES[@]} files..."
OUT="$(curl -sS --fail -u "$IPFS_RPC_USER:$IPFS_RPC_PASS" -X POST "${ARGS[@]}" \
  "$RPC/add?pin=true&cid-version=1&raw-leaves=true&quieter=false&progress=false")"
CID="$(printf '%s\n' "$OUT" | grep '"Name":"site"' | sed -E 's/.*"Hash":"([^"]+)".*/\1/')"
[ -n "$CID" ] || { echo "No root CID in response"; printf '%s\n' "$OUT" | tail -n 3; exit 1; }
echo "Root CID: $CID"

echo "Publishing /ipfs/$CID to IPNS key ${KEY}..."
PUB="$(curl -sS --fail -u "$IPFS_RPC_USER:$IPFS_RPC_PASS" -X POST \
  "$RPC/name/publish?arg=/ipfs/$CID&key=$KEY&lifetime=8760h&ttl=1m&allow-offline=true&ipns-base=base36")"
NAME="$(printf '%s' "$PUB" | sed -E 's/.*"Name":"([^"]+)".*/\1/')"
echo "IPNS: $NAME"
echo "Index (stable):    $GW/ipns/$NAME/"
echo "Index (this build): $GW/ipfs/$CID/"
echo "Home screenshot:   $GW/ipns/$NAME/assets/og-home.png"
