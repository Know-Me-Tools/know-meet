#!/usr/bin/env bash
# Publish the Know Meet prototype + design docs to IPFS and point the
# "know-meet" IPNS name at the new version. The site is staged with
# scripts/build-site.sh, so it has the same layout as the GitHub Pages mirror:
# the prototype at /, the brand kit at /docs/design/.
#
# Credentials come from the environment only — never commit them:
#   export IPFS_RPC_USER=...   IPFS_RPC_PASS=...
# Optional:
#   IPFS_RPC   (default https://console.prometheusags.ai/api/v0)
#   IPNS_KEY   (default know-meet)
#   GATEWAY    (default https://ipfs.prometheusags.ai)
#   DRY_RUN=1  stage the site and list what would be uploaded; no credentials
#              needed, nothing is sent
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
DRY_RUN="${DRY_RUN:-}"
if [ -z "$DRY_RUN" ]; then
  : "${IPFS_RPC_USER:?set IPFS_RPC_USER}"; : "${IPFS_RPC_PASS:?set IPFS_RPC_PASS}"
fi
RPC="${IPFS_RPC:-https://console.prometheusags.ai/api/v0}"
KEY="${IPNS_KEY:-know-meet}"
GW="${GATEWAY:-https://ipfs.prometheusags.ai}"

SITE="$(mktemp -d)"
trap 'rm -rf "$SITE"' EXIT
scripts/build-site.sh "$SITE"
cd "$SITE"

# Every staged file except dotfiles. (Portable to macOS bash 3.2: no mapfile.)
FILES=()
while IFS= read -r f; do FILES+=("$f"); done < <(find . -type f -not -path '*/.*' | sed 's#^\./##' | sort)
DIRS=()
while IFS= read -r d; do [ -n "$d" ] && DIRS+=("$d"); done < <(printf '%s\n' "${FILES[@]}" | while IFS= read -r f; do dirname "$f"; done | grep -v '^\.$' | awk -F/ '{p=""; for(i=1;i<=NF;i++){p=(p?p"/":"")$i; print p}}' | sort -u)

if [ -n "$DRY_RUN" ]; then
  printf '%s\n' "${FILES[@]}"
  echo "Dry run: ${#FILES[@]} files in ${#DIRS[@]} directories would be uploaded to $RPC (IPNS key $KEY)."
  exit 0
fi

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
echo "Brand guide:       $GW/ipns/$NAME/docs/design/brand-guide.html"
echo "Home screenshot:   $GW/ipns/$NAME/assets/og-home.png"
