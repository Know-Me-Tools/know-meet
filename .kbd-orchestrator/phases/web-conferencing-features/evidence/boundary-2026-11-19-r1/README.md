# Boundary run r1, 2026-11-19 (after repair 1)

Candidate commit: `e0d69c99` on `feat/web-conferencing-features`. Admit check: READY, digest 24260182…, planRevision 1. Step records are in `argv-and-exit.json`.

| Step | Command | Log | Result |
|---|---|---|---|
| 1 | `pnpm install --frozen-lockfile` | `01-static-1.log` | PASS (exit 0) |
| 2 | `pnpm lint` | `02-static-2.log` | FAIL (exit 1). pins, names, lines, colours, secrets, boundaries and biome passed. `lint:native` failed: `flutter analyze` reports `missing_required_argument` for `meterFill` at `apps/mobile/lib/shared/ui/km_palette_of.dart:21`. The Rust checks passed. |
| 3 to 6 | typecheck, test, build, build:hosted | none | NOT RUN (the runner stopped at step 2) |

Cause: the token regeneration (prep commit `e0d69c99`, meter-fill v1.6.0) added a required `meterFill` field to the generated Dart `KmPalette`. The hand-written fallback `_fromScheme` in the mobile app does not pass it.
