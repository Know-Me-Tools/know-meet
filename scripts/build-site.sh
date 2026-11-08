#!/usr/bin/env bash
# Assembles the published site into DEST, using the layout that both the IPNS
# site and the GitHub Pages mirror serve:
#   /               -> docs/design/prototype (home, screens, every page, assets/)
#   /docs/design/   -> brand guide, template, mood board, logos, tokens, README
#
# Usage: scripts/build-site.sh DEST   (DEST must be empty or not exist yet)
set -euo pipefail
DEST="${1:?usage: build-site.sh DEST}"
cd "$(git rev-parse --show-toplevel)"

if [ -e "$DEST" ] && [ -n "$(ls -A "$DEST")" ]; then
  echo "build-site: $DEST is not empty" >&2
  exit 1
fi

mkdir -p "$DEST/docs/design"
cp -R docs/design/prototype/. "$DEST/"
rsync -a --exclude prototype --exclude '*.artifact.json' --exclude .DS_Store \
  docs/design/ "$DEST/docs/design/"
find "$DEST" -name .DS_Store -delete
