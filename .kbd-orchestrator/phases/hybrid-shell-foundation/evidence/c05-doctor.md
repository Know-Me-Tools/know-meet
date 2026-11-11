# c05 task 5.2: knowme-builder doctor, React and Flutter platform checks

- **Change / task:** `c05-scaffold-generation-import` 5.2, role build-platform
- **Recorded:** 2026-11-09, macOS 26 (Apple Silicon), knowme-builder 2.0.0-alpha.5, prometheus 1.14.0
- **Raw output:** `evidence/c05-generation/doctor-repo-root.json`, `doctor-native-only.json`,
  `prometheus-doctor-failing.json`, `prometheus-doctor-packroot-summary.json`

## Result

| Command (cwd) | Exit | Result |
|---|---|---|
| `knowme-builder doctor --json` (repo root) | 1 | `ok:false`, 0 conflicts; warning "Prometheus doctor reported 4 failing health check(s)" |
| `knowme-builder doctor --json --native-only` (repo root) | 0 | `ok:true`; rustc/cargo 1.97.1; one warning (no cross-target requested) |
| `prometheus doctor --json` (repo root) | 1 | 4 failed, 4 warned, 12 passed, 4 skipped |
| `prometheus doctor --json` (`/Users/gqadonis/Projects/prometheus/prometheus-skill-pack`) | 0 | 0 failed, 4 warned, 18 passed, 2 skipped |

Builder's own checks pass: the hybrid-mobile-architecture manifest 2.0.0-alpha.5 is
consistent across 6 harnesses, the Prometheus package (1.14.0, needs 1.7.0) and
control-plane contract 2.0.0 are compatible, and the typed KBD and learning
commands are available. Every failure comes from the nested `prometheus doctor`.

## Failing checks: cause and remediation

All four are **cwd-relative control-plane checks**. `prometheus doctor` resolves
`./skills`, `./scripts/...` and `./shared/harnesses/...` against the current
directory, so run from an application repo it inspects Know Meet as if it were the
skill-pack checkout. From the skill-pack root the same binary reports 0 failures.
None of them concern this repository or the generated application.

| Check ID | Diagnostic | Cause | Remediation |
|---|---|---|---|
| `skills.directory` | `skills/ is missing`; "Required runtime skill catalog is absent." | Looks for `./skills` in the cwd (Know Meet has none; skills install under harness dot-folders). | Run the Prometheus health check from the skill-pack checkout, or use `knowme-builder doctor --native-only` for application work. No repo change. |
| `execution.runtime` | `prometheus-exec doctor reported unhealthy` | Same cwd resolution; passes from the pack root. `prometheus-exec doctor` itself requires `--socket/--state-dir/--identity`. | As above. Nothing to fix here. |
| `hooks.lifecycle` | `Cannot find module '.../know-meet/scripts/install-plugin-generation.js'` | Runs a pack-relative script against the cwd. | As above. Do not add that script to Know Meet. |
| `hooks.harness-adapters` | 46 defects: `./shared/harnesses/generated/release-manifest.json` unreadable, `./hooks/codex-hooks.json` unreadable, ... | Pack-relative paths resolved against the cwd. | As above. |

Warnings (non-blocking, recorded only): `plugins.source-topology` (marketplace
sources have uncommitted changes), `control.kbd-runtime` (control socket not
answering), `control.kbd-rollout` (shadow evidence not started),
`skills.discovery-budget` (no discovery baselines).

**Fixed:** nothing needed fixing in this repository. **Upstream note (not ours to
change):** knowme-builder should invoke the nested Prometheus doctor with the pack
root as its working directory, or `prometheus doctor` should resolve paths from
its install location. Logged in `.prometheus/gotchas.md`.

## React 19.2.7: confirmed

- `apps/web/package.json` (from `governed-web-shell/web`): `react` 19.2.7, `react-dom` 19.2.7
- `apps/web/baselines/desktop/package.json` (from `sovereign-hybrid/desktop`): `react` 19.2.7, `react-dom` 19.2.7
- `pnpm-lock.yaml` importers `apps/web` and `apps/web/baselines/desktop` resolve 19.2.7.

## Flutter iOS and Android platform folders: confirmed

From `sovereign-hybrid/mobile`, now `apps/mobile`:

- iOS: `ios/Runner.xcodeproj/project.pbxproj`, `ios/Runner.xcworkspace`, `ios/Runner/{AppDelegate,SceneDelegate}.swift`, `Info.plist`, `Podfile`, `Flutter/*.xcconfig`, `RunnerTests/`
- Android: `android/app/build.gradle.kts`, `android/app/src/{main,debug,profile}/AndroidManifest.xml`,
  `MainActivity.kt` (`org.example.baseline_mobile`), `settings.gradle.kts`, `build.gradle.kts`, Gradle wrapper
- `gradlew` and `gradlew.bat` are present but ignored by the Flutter-template `android/.gitignore`, as in every `flutter create` project.
- No macOS, Linux, Windows or web Flutter runners are generated (only `rust-builder` plugin folders for those).
