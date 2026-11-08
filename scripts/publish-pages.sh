#!/usr/bin/env bash
# Rebuilds the GitHub Pages mirror on the gh-pages branch, laid out like the IPNS
# site (see scripts/build-site.sh).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
SITE="$(mktemp -d)"
trap 'rm -rf "$SITE"' EXIT
scripts/build-site.sh "$SITE"
touch "$SITE/.nojekyll"
SRC="$(git rev-parse --short HEAD)"
git -C "$SITE" init -q -b gh-pages
git -C "$SITE" add -A
git -C "$SITE" -c user.name="$(git config user.name)" -c user.email="$(git config user.email)" \
  commit -q -m "Publish prototype mirror from main@$SRC"
git -C "$SITE" push -q -f "$(git remote get-url origin)" gh-pages
echo "Published main@$SRC -> https://know-me-tools.github.io/know-meet/"
