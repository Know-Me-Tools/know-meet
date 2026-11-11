# c01 task 1.5: toolchain install and verification

- **Change / task:** `c01-workspace-and-repo-rules` 1.5, role build-platform
- **Recorded:** 2026-11-09T12:08Z, macOS 26 (Apple Silicon)
- **Authority:** operator approval in `decision-log.md` (2026-11-09T11:35:48Z, "Toolchain: approved to install the pinned Rust, Tauri CLI, pnpm, Flutter stable and knowme-builder alpha.5")
- **Pin source:** `tooling/versions.toml`, sha256 `0c2f7f60a768c121fcbf8264b42969f68b3dce301d3b176c55ea31a3e7b53a3c`, byte-identical copy of `/Users/gqadonis/Projects/hybrid-mobile-architecture-src/versions.toml` (reference commit `f34584a`; file last changed in `e62ad61`). Provenance in `tooling/versions.source.json`.

## Result: PASS, every pinned tool matches

Command (from the repo root): `pnpm run verify:toolchain` → `node tooling/repo-rules/src/check-toolchain.ts`. Exit code **0**.

| Tool | Pin (source) | Before | Installed now | Match |
|---|---|---|---|---|
| Node | 26.5.0 (`[toolchain].node`) | 26.5.0 (fnm default) | 26.5.0 | yes |
| pnpm | 11.15.0 (`[toolchain].pnpm`) | 11.25.0 (corepack shim) | 11.15.0, selected by `packageManager` in `package.json` | yes |
| TypeScript | 7.0.2 (`[toolchain].typescript`) | not installed | 7.0.2 (root devDependency) | yes |
| Rust | 1.97.1 (`[toolchain].rust`) | 1.99.1 (rustup default stable) | 1.97.1, selected by `rust-toolchain.toml` (rustfmt, clippy) | yes |
| tauri-cli | 2.11.4 (`[frameworks].tauri_cli`) | 2.10.0 | 2.11.4 (`cargo +1.97.1 install tauri-cli --version 2.11.4 --locked --force`) | yes |
| Flutter | 3.47.5 stable (`[toolchain].flutter`) | 3.48.0-0.5.pre, beta | 3.47.5, channel stable | yes |
| Dart | 3.13.4 (`[platform].dart`) | 3.14.0-95.2.beta | 3.13.4 (bundled with Flutter 3.47.5) | yes |
| knowme-builder | 2.0.0-alpha.5 (`versions.source.json` `sourcePackageVersion`; reference `tools/knowme-builder/Cargo.toml`) | 2.0.0-alpha.1 | 2.0.0-alpha.5 | yes |

Output:

```text
node: wanted 26.5.0, found 26.5.0
pnpm: wanted 11.15.0, found 11.15.0
typescript: wanted 7.0.2, found 7.0.2
rust: wanted 1.97.1, found 1.97.1
tauri-cli: wanted 2.11.4, found 2.11.4
flutter: wanted 3.47.5, found 3.47.5
flutter-channel: wanted stable, found stable
dart: wanted 3.13.4, found 3.13.4
knowme-builder: wanted 2.0.0-alpha.5, found 2.0.0-alpha.5
```

**c05 and c06 are not blocked by toolchain drift.**

## How each tool was changed

- **pnpm:** no global change. The corepack shim at `/usr/local/bin/pnpm` honours `"packageManager": "pnpm@11.15.0"`, so inside this repo pnpm is 11.15.0. Outside the repo it is still 11.25.0.
- **Rust:** no global change. 1.97.1 was already installed through rustup; `rust-toolchain.toml` selects it inside this repo. The global default is still 1.99.1.
- **tauri-cli:** global `~/.cargo/bin/cargo-tauri` replaced (2.10.0 → 2.11.4), built with 1.97.1.
- **Flutter:** global SDK at `~/development/flutter` moved from the `beta` branch (HEAD `c9306d5b2efe749ffd9450e838ba3399785a35e6`) to a local `stable` branch at tag `3.47.5` (`git checkout -B stable 3.47.5`, upstream `origin/stable`). The old `beta` branch is untouched; it carries 14 local commits not on `origin/beta`. Roll back with `git -C ~/development/flutter checkout beta`. Every other project using this SDK now gets 3.47.5 stable.
- **knowme-builder:** `cargo +1.97.1 install --locked --force --path /Users/gqadonis/Projects/hybrid-mobile-architecture-src/tools/knowme-builder --target-dir /tmp/km-c01/kb-target`. The build output went to `/tmp` so nothing was written into the read-only reference. `git status` on the reference's `tools/` and `versions.toml` was clean afterwards. The binary embeds the reference's `skills/` and `assets/templates` at commit `f34584a`, which has uncommitted changes in other paths (`docs/`, `.prometheus/`). Those paths aren't embedded.

## Re-running

- Full local check: `pnpm run verify:toolchain`
- CI (Linux runners have no desktop or mobile tools): `pnpm run verify:toolchain --only node,pnpm,typescript`
- Pin drift between `versions.toml` and its derived files (`rust-toolchain.toml`, `package.json` `packageManager`, `engines`, `typescript`) fails `pnpm run lint:pins`.
