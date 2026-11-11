# c05 tasks 5.3–5.6: generation, import, renames, inventory

- **Change:** `c05-scaffold-generation-import`, role build-platform (architect duties for `crates/**` and PEM delegated for this change)
- **Recorded:** 2026-11-09. Generator: knowme-builder 2.0.0-alpha.5 (reference commit `f34584a`, read-only; nothing written there).
- **Method:** VLBV. No generated-code builds, tests, lint or typecheck were run. A cold `cargo check --workspace` was started before the stricter VLBV instruction arrived; it was killed by the session ending (exit 137) with no compiler output, so it proves nothing and is not evidence. Compile verification is deferred to c14/c13.

## 5.3 Generation (scratch, outside the repo)

| Profile | Command | Exit | Files | Digest-list sha256 |
|---|---|---|---|---|
| sovereign-hybrid | `knowme-builder new --json --profile sovereign-hybrid --mode runnable /tmp/know-meet-gen/sovereign-hybrid` | 0 | 201 | `1e687a2c59d6c12f38bc24cda829e40ee5d723333c6616669af8efadd130ac8a` |
| governed-web-shell | `knowme-builder new --json --profile governed-web-shell --mode runnable /tmp/know-meet-gen/governed-web-shell` | 0 | 41 | `86ba920995ba9160b0a360acf962e05bfc203d5a301b7518ff3d9284dd131c90` |

Both previewed first with `--check` (exit 0). Both returned `ok:true`, no conflicts, one warning: "runnable source generation is not host certification; pass --target and/or --verify-ffi". Per-file sha256 lists: `c05-generation/sovereign-hybrid.sha256`, `c05-generation/governed-web-shell.sha256`; summary `c05-generation/manifest.json`.

Profile surfaces (`.knowme-builder/project.toml`): sovereign-hybrid = `flutter-mobile`, `tauri-desktop`, `rust-core`, `uarMode = "hybrid"`; governed-web-shell = `react-web`, `axum-bff`, `uarMode = "service"`.

## 5.4 Import layout

```text
Cargo.toml                       root workspace (resolver 3); Cargo.lock seeded from the generated Tauri lock
crates/
  README.md                      sovereign-hybrid README (UAR authority statement)
  capabilities/index.json        rust-core capability registry (include_str! from gen-ui-notes)
  gen-ui-types/  gen-ui-db/  gen-ui-notes/   workspace members (identical in both profiles)
  gen-ui-ffi/                    flutter_rust_bridge crate, EXCLUDED from the workspace, own Cargo.lock (as generated)
services/bff/                    Axum BFF (governed-web-shell/server), package renamed to `bff`
  README.md, baseline-web.md, capabilities/index.json, src/main.rs
apps/web/                        governed-web-shell React 19 web (@know-meet/web)
  baselines/desktop/             sovereign-hybrid React 19 desktop UI (@know-meet/desktop-baseline), staged for c06
apps/desktop/                    only src-tauri/ + baseline-desktop.md
apps/mobile/                     Flutter app + rust-builder/ (FRB plugin) + baseline-mobile.md
```

Workspace members from `cargo metadata` (resolves, exit 0, 458 packages): `bff`, `gen_ui_db`, `gen_ui_notes`, `gen_ui_types`, `sovereign_hybrid_desktop`.
pnpm importers after `pnpm install` (exit 0): `.`, `apps/web`, `apps/web/baselines/desktop`, `packages/design-tokens`, `tests/fidelity`.

**Not imported, on purpose:** both profiles' `.knowme-builder/` state (`project.toml`, `generated.lock.json`, 731-line `activation-manifest.json`) and `skills-lock.json`. They describe two different single-profile projects at one root; importing either would make Builder treat Know Meet as that profile. Use `knowme-builder adopt` later if Builder ownership is wanted. Digests are in the manifest. Also dropped: generated npm `package-lock.json` files (pnpm workspace), the generators' root `.gitignore` (merged into the root `.gitignore`) and `rust-toolchain.toml` copies (identical channel 1.97.1 to the root file).

### UAR and PEM wiring (kept intact)

The generator emits **no separate UAR or PEM directory** in either profile, so `services/uar/**`, `generated/uar/**` and `packages/pem/**` stay empty. The wiring that exists:

- **UAR:** `apps/desktop/src-tauri/command-manifest.json` (declared `uar_run`, `uar_cancel`, `uar_recover` commands and `uar://run-event`, not yet registered in `main.rs`); BFF `/api/runtime` returning 503 "UAR runtime is not configured"; `crates/README.md` authority statement.
- **PEM:** npm `@prometheus-ags/prometheus-entity-management` 4.2.0 + `@prometheus-ags/entity-graph-core` 4.2.0 in both React baselines, used by `src/features/notes/entities/use-note-entities.ts` and `stores/notes.ts`.

### Path rewiring

| File | Change |
|---|---|
| `crates/gen-ui-{db,notes,ffi}/Cargo.toml` | path deps `../gen_ui_*` → `../gen-ui-*` |
| `services/bff/Cargo.toml` | `name = "bff"` (VS-9 `cargo build -p bff`); `../rust/gen_ui_notes` → `../../crates/gen-ui-notes`; `tower-http` `=0.6.6` → `=0.6.11` (see pins) |
| `services/bff/src/main.rs` | default `WEB_DIST_DIR` `web/dist` → `apps/web/dist` |
| `apps/desktop/src-tauri/Cargo.toml` | `../../rust/gen_ui_notes` → `../../../crates/gen-ui-notes`; generated per-crate `Cargo.lock` moved to the root |
| `apps/desktop/src-tauri/tauri.conf.json` | `frontendDist` `../../web/baselines/desktop/dist`; before-commands `pnpm --filter @know-meet/desktop-baseline run dev/build` |
| `apps/mobile/flutter_rust_bridge.yaml` | `rust_root: ../../crates/gen-ui-ffi/` |
| `apps/mobile/rust-builder/{ios,macos}/*.podspec`, `android/build.gradle`, `linux|windows/CMakeLists.txt` | cargokit manifest path `…/rust/gen_ui_ffi` → one level deeper `…/crates/gen-ui-ffi` |
| `apps/mobile/pubspec.yaml`, `pubspec.lock`, `analysis_options.yaml` | `rust_builder` → `rust-builder` |
| `apps/web/tests/restart.mjs` | project root = repo root; `services/bff/Cargo.toml`; binary `bff` |
| `apps/web/package.json`, `baselines/desktop/package.json` | names `@know-meet/web`, `@know-meet/desktop-baseline` |

### Pin changes

- `tower-http` `=0.6.6` → `=0.6.11` in the BFF: one lockfile cannot hold 0.6.6 because `tauri 2.11.3 → reqwest 0.13` needs `^0.6.8`; 0.6.11 is what the generated Tauri lock already used. Rationale comment is in the manifest.
- `tokio` resolves to the BFF's exact `=1.49.0` for the whole workspace (the generated Tauri lock had 1.53.1). Tauri accepts 1.49.0; no manifest change.

## 5.5 Renames (kebab-case, Dart/Rust exceptions kept)

- Directories: `rust/gen_ui_{types,db,notes,ffi}` → `crates/gen-ui-*`; `mobile/rust_builder` → `apps/mobile/rust-builder`; `server` → `services/bff`.
- TypeScript (both baselines): `NotesScreen.tsx` → `notes-screen.tsx`, `useNotes.ts` → `use-notes.ts`, `useNoteEntities.ts` → `use-note-entities.ts`; imports updated (static grep: no stale PascalCase/camelCase imports).
- Docs: `BASELINE-{WEB,DESKTOP,MOBILE}.md` → `baseline-*.md`; `rust_builder/UPSTREAM.md` → `upstream.md`.
- Kept by exception: Rust package names `gen_ui_*`, `sovereign_hybrid_desktop` (FRB/cargokit and podspec use the lib name); Dart `*.dart` and `lib/`/`test/` dirs (E-N1); Rust `src/` modules (E-N2); `flutter_rust_bridge.yaml`, `integration_test/`, `test_driver/` (E-N3, tool-mandated); `rust-builder/{android,ios,macos,linux,windows}` (E-N4); `rust-builder/cargokit/**` (E-N5, vendored FRB output, LICENSE + upstream.md). These were added to `tooling/ls-lint/ls-lint.yml`. A static name scan of the import finds no other non-kebab path. `ls-lint` itself was not run (VLBV; deferred to c13/c14).

## 5.6 Inventory and line check

Full per-file table with owners: `c05-inventory.md` (210 files). `node tooling/repo-rules/src/check-lines.ts` → exit 1, 6 violations in 450 files, **none in imported surfaces**, so no splits were needed. The 6 are pre-existing and owned by delivery-lead: `.agent-team/know-meet-team/state.json` (635), `team.json` (632), and four raw reviewer streams under `.kbd-orchestrator/phases/hybrid-shell-foundation/review/**/raw-*.txt` (655–2658). They need either a split or an exception decision before VS-8.

## Static compile concerns (not verified by building)

1. `@prometheus-ags/prometheus-entity-management` 4.2.0 pulls `entity-graph-react` 4.3.0, which wants `entity-graph-core ^4.3.0`; the generator pins 4.2.0 (`pnpm peers check`). Generator pin drift; c06 decides.
2. Playwright pin drift: `apps/web` `@playwright/test` 1.63.0 vs `tests/fidelity` 1.65.0.
3. `gen-ui-ffi` is outside the root workspace, so `cargo check --workspace` does not cover it; VS-9's FRB regeneration step covers it via its own manifest.
4. `tauri.conf.json` before-commands now use pnpm; the desktop-baseline `package.json` still lists `@tauri-apps/cli` as a devDependency while the host uses global `cargo-tauri` 2.11.4.
