#!/usr/bin/env bash
# Gate 16.3: builds both prototypes twice into harness-owned output directories without touching
# their sources or their own dist/: a non-profiling production build (the measured build) and the
# profiling build (React commit counts only). Uses each prototype's own vite.config.ts via
# vite-variant.config.mts.
set -euo pipefail
SPIKE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$SPIKE_DIR/harness/reports/builds-16-3"
CONFIG="$SPIKE_DIR/measurements/scripts/vite-variant.config.mts"
mkdir -p "$OUT"
for proto in hybrid own; do
  for variant in no-profiling profiling; do
    echo "== $proto $variant"
    (cd "$SPIKE_DIR/$proto" && KM_BUILD_VARIANT="$variant" pnpm exec vite build --configLoader native \
      --config "$CONFIG" --outDir "$OUT/$proto-$variant" --emptyOutDir --logLevel warn)
    # The profiling reconciler carries Profiler timing fields; the production one does not.
    markers=$(cat "$OUT/$proto-$variant"/assets/*.js | grep -o actualDuration | wc -l | tr -d ' ')
    if [ "$variant" = profiling ] && [ "$markers" = 0 ]; then echo "profiling build lacks Profiler timing" >&2; exit 1; fi
    if [ "$variant" = no-profiling ] && [ "$markers" != 0 ]; then echo "no-profiling build still has Profiler timing" >&2; exit 1; fi
  done
done
echo "builds in $OUT"
