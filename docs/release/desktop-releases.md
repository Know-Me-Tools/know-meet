# Desktop releases (Tauri)

The workflow is `.github/workflows/release.yml`. It builds the Know Meet desktop app (`apps/desktop`,
which serves the `apps/web` build) on native GitHub-hosted runners for six targets. It then uploads
the installers to a **draft** GitHub Release. A maintainer reviews the draft and publishes it by
hand: the workflow never publishes on its own.

Operator decision, 2026-11-11 (`.kbd-orchestrator/phases/hybrid-shell-foundation/decision-log.md`):
there is no Windows machine, so CI builds every desktop target.

## Cutting a release

1. Commit and push the tree. The workflow only sees what is on GitHub.
2. Bump `version` in `apps/desktop/src-tauri/tauri.conf.json`. That file belongs to client-shell, so
   ask them to make the change.
3. Tag the commit with exactly `v<version>` and push the tag:

   ```bash
   git tag v0.1.0 && git push origin v0.1.0
   ```

   The `prepare` job fails if the tag and the `tauri.conf.json` version differ.
4. The workflow then runs three jobs:
   - `full` runs the repo rules, typecheck, test and build.
   - `prepare` creates the draft release `Know Meet v<version>` with generated notes, or reuses the
     existing draft.
   - `desktop` runs the six-target matrix. Each leg uploads its installers to the draft and also
     keeps them as workflow artifacts.
5. Download and smoke-test the installers. Then publish the draft on the Releases page, or run
   `gh release edit v0.1.0 --draft=false`.

To re-run a single failed target, re-run that job. tauri-action replaces assets that already exist
on the draft.

**Dry run.** Start the workflow with `workflow_dispatch` on a branch: `gh workflow run release.yml --ref main`.
The installers are kept only as workflow artifacts, and no release is created. If you dispatch on a
tag ref instead, the run behaves like a tag push.

## Targets and runners

Runner labels were checked against the `actions/runner-images` README (2026-11). The arm64 runners
are free only for public repositories, which `Know-Me-Tools/know-meet` currently is.

| Target | Runner | Bundles | Release asset name |
| --- | --- | --- | --- |
| Windows x64 | `windows-2025` | `.msi`, NSIS `-setup.exe` | `know-meet_<v>_windows_x64[-setup].{msi,exe}` |
| Windows arm64 | `windows-11-arm` | NSIS `-setup.exe` | `know-meet_<v>_windows_arm64-setup.exe` |
| macOS arm64 | `macos-26` | `.app` (tarred), `.dmg` | `know-meet_<v>_macos_arm64.{dmg,app.tar.gz}` |
| macOS x64 | `macos-26-intel` | `.app` (tarred), `.dmg` | `know-meet_<v>_macos_x64.{dmg,app.tar.gz}` |
| Linux x64 | `ubuntu-22.04` | `.deb`, `.rpm`, `.AppImage` | `know-meet_<v>_linux_x64.{deb,rpm,AppImage}` |
| Linux arm64 | `ubuntu-22.04-arm` | `.deb`, `.rpm`, `.AppImage` | `know-meet_<v>_linux_arm64.{deb,rpm,AppImage}` |

Every target builds on its own native runner, so nothing is cross-compiled. Workflow artifacts are
named `know-meet-<os>-<arch>-<bundle>`.

## How a leg builds

- **Toolchains** come from `tooling/versions.toml`:
  - Node and pnpm through `package.json` (`engines.node`, `packageManager`);
  - Rust through `rust-toolchain.toml`, installed by rustup on each runner;
  - the Tauri CLI through `apps/desktop` (`@tauri-apps/cli`).
- **Linux** installs `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf` and
  `xdg-utils`, as in the Tauri v2 GitHub pipeline docs.
- **Caching:**
  - the pnpm store is cached by `actions/setup-node`;
  - the Rust `target/` directory and registry are cached by `Swatinem/rust-cache`, keyed per OS and
    arch;
  - turbo's remote cache is used when `TURBO_TOKEN` and `TURBO_TEAM` are set.
  - GitHub scopes caches to the ref, so a new tag can only read caches saved on `main`. Expect cold
    Rust builds on the first run of each tag. Re-runs are warm.
- **Web build:**
  1. turbo builds the workspace packages that `apps/web` depends on (`--filter=@know-meet/web^...`).
  2. The web app itself is built once, by Tauri's `beforeBuildCommand`.
- **CSP:** tauri-action runs `pnpm tauri build --bundles <list>` in `apps/desktop`. The wrapper
  `scripts/tauri-cli.ts` merges in the CSP built from `KM_LIVEKIT_URL` and `KM_MEDIA_ORIGINS`. Set
  these as repository **variables**, not secrets: they are public origins. If they are unset, the
  CSP has no LiveKit or media origin.
- **Bundles:** `tauri.conf.json` lists only `"app"` as a bundle target. The workflow chooses
  installer formats per OS with `--bundles`, so the config file stays untouched.

## Code signing (optional; skipped when the secrets are absent)

Without these secrets, the workflow still produces unsigned installers:

- macOS shows a Gatekeeper warning, and the app is only ad-hoc signed.
- Windows SmartScreen warns on first run.

Never commit certificate material. Add the secrets under Settings → Secrets and variables →
Actions.

### macOS: Developer ID signing and notarisation

| Secret | Value |
| --- | --- |
| `APPLE_CERTIFICATE` | `openssl base64 -A -in DeveloperID.p12` |
| `APPLE_CERTIFICATE_PASSWORD` | Password used when exporting the `.p12` |
| `APPLE_SIGNING_IDENTITY` | Optional; Tauri infers it from the certificate |
| `APPLE_API_ISSUER` | App Store Connect API issuer ID (notarisation) |
| `APPLE_API_KEY` | App Store Connect API key ID |
| `APPLE_API_PRIVATE_KEY` | Contents of `AuthKey_<id>.p8` |

The signing step runs only when `APPLE_CERTIFICATE` is set. It exports only the non-empty values,
because Tauri treats a set-but-empty variable as present. It also writes the `.p8` key to the runner
temp directory and sets `APPLE_API_KEY_PATH`. Notarisation runs when all three `APPLE_API_*` secrets
are present.

Apple ID notarisation (`APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`) is not wired. Add it the same
way if the API-key route is not available.

### Windows: Authenticode with a PFX certificate

| Secret / variable | Value |
| --- | --- |
| `WINDOWS_CERTIFICATE` (secret) | Base64 of the `.pfx` |
| `WINDOWS_CERTIFICATE_PASSWORD` (secret) | PFX password |
| `WINDOWS_TIMESTAMP_URL` (variable, optional) | Defaults to `http://timestamp.digicert.com` |

When `WINDOWS_CERTIFICATE` is set, the step:

1. imports the PFX into `Cert:\CurrentUser\My`;
2. writes a temporary Tauri config with `certificateThumbprint`, `sha256` and the timestamp URL;
3. passes that config as an extra `--config`.

Code-signing certificates issued since 2023 keep the key in hardware (HSM), so many cannot be
exported as a PFX. In that case, use Azure Trusted Signing through Tauri's
`bundle.windows.signCommand`. That is a follow-up change to this workflow and to client-shell's
config.

### Updater

The updater is not configured (`uploadUpdaterJson: false`). Enabling it needs:

- `tauri-plugin-updater` in the app;
- the `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secrets;
- `uploadUpdaterJson: true`.

## WebView2 gate 16.1 (`.github/workflows/webview2-gate.yml`)

This workflow runs the Windows leg of gate 16.1 from `spikes/agentic-ui/own/webview2-runbook.md`
on `windows-2025` (x64) and `windows-11-arm` (arm64). It is triggered by:

- `workflow_dispatch`, with a `repeats` input (default 6, minimum 6);
- pull requests that touch `spikes/agentic-ui/**`.

Each arch uploads `webview2-gate-16-1-<arch>` (raw records, `summary.json`, `summary.md` and driver
logs), and the summary is also written to the job summary. The workflow needs no secrets.

Start a run with:

```bash
gh workflow run webview2-gate.yml -f repeats=6
```

Record the result in `spikes/agentic-ui/own/gates/16-1-scheduler.md`, as the runbook describes.

## Known limits

- **Windows CLI wrapper (blocks both Windows legs until fixed).** `apps/desktop/scripts/tauri-cli.ts`
  runs `spawnSync("tauri", …, { shell: false })`. On Windows, Node cannot launch the `tauri.cmd`
  shim without a shell, so the call fails with `ENOENT`. This is already carried as a c13 risk.
  Fix (client-shell): spawn `process.execPath` with the resolved `@tauri-apps/cli` JS entry
  (`tauri.js`), or use `shell: true` on `win32` only.
- **No MSI on Windows arm64.** WiX is not preinstalled on the arm64 image, and that image has no
  .NET Framework 3.5. The arm64 leg therefore ships NSIS only. The NSIS installer itself is x86 and
  runs under emulation, but the app inside it is native arm64. Try `msi` again after one verified run.
- **Linux glibc floor.** The Linux legs use Ubuntu 22.04 for the glibc 2.35 floor. Move to
  `ubuntu-24.04[-arm]` when 22.04 runners are retired.
- **Release builds are not cached across tags** (see Caching above). A cold build of all six legs
  takes roughly 20–40 minutes, unmeasured until the first run.
- **The gate's pass/fail is read from the artifacts.** The summarise step does not fail the job
  when a state misses the 1.5× criterion.
- **Linux packages are not signed.** RPM/GPG signing (`TAURI_SIGNING_RPM_KEY`) is not wired.
