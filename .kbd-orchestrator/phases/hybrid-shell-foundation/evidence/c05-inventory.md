# c05 task 5.6: imported-file inventory

- **Scope:** every file imported by c05 under `apps/`, `crates/`, `services/` plus root `Cargo.toml` (tracked or untracked-not-ignored; `node_modules` excluded). Root `Cargo.lock` is E-L1.
- **Line check:** `node tooling/repo-rules/src/check-lines.ts` from the repo root, exit 1, `6 violation(s) in 450 item(s) checked`. **None of the 6 is an imported file** (see `c05-import.md`). Max authored file in the import: 301 lines (`cargokit/build_tool/lib/src/options.dart`, vendored); max authored first-party file: under 120 lines.
- **Files over 500 lines:** `apps/mobile/ios/Runner.xcodeproj/project.pbxproj` 647 (E-L4), `apps/mobile/pubspec.lock` 867 (E-L1), `crates/gen-ui-ffi/Cargo.lock` 940 (E-L1). **Splits required: none.**
- **Totals:** 210 files. By owner: UNOWNED 72, architect 16, bdd-quality 1, build-platform 6, client-shell 32, mobile-engineer 83.
- Owner = most specific glob in `.agent-team/know-meet-team/team.json`.
- **Ownership gap (request to delivery-lead, owner of team.json):** 72 files match no glob. Proposed: mobile-engineer `apps/mobile/rust-builder/**`, `apps/mobile/test_driver/**`; client-shell `apps/web/baselines/**`, `apps/web/scripts/**`, `apps/web/src/features/**` (transitional until c06 maps them onto the four layers), `apps/web/tests/**`. Until then the spec clause "each path has an owner" is not met.

| Path | Lines | Owner | Exception |
|---|---|---|---|
| `apps/desktop/baseline-desktop.md` | 9 | client-shell |  |
| `apps/desktop/src-tauri/build.rs` | 11 | client-shell |  |
| `apps/desktop/src-tauri/capabilities/default.json` | 11 | client-shell |  |
| `apps/desktop/src-tauri/Cargo.toml` | 12 | client-shell |  |
| `apps/desktop/src-tauri/command-manifest.json` | 39 | client-shell |  |
| `apps/desktop/src-tauri/icons/128x128.png` | bin | client-shell |  |
| `apps/desktop/src-tauri/icons/128x128@2x.png` | bin | client-shell |  |
| `apps/desktop/src-tauri/icons/32x32.png` | bin | client-shell |  |
| `apps/desktop/src-tauri/icons/64x64.png` | bin | client-shell |  |
| `apps/desktop/src-tauri/icons/icon.icns` | bin | client-shell |  |
| `apps/desktop/src-tauri/icons/icon.ico` | bin | client-shell |  |
| `apps/desktop/src-tauri/icons/icon.png` | bin | client-shell |  |
| `apps/desktop/src-tauri/icons/Square107x107Logo.png` | bin | client-shell |  |
| `apps/desktop/src-tauri/icons/Square142x142Logo.png` | bin | client-shell |  |
| `apps/desktop/src-tauri/icons/Square150x150Logo.png` | bin | client-shell |  |
| `apps/desktop/src-tauri/icons/Square284x284Logo.png` | bin | client-shell |  |
| `apps/desktop/src-tauri/icons/Square30x30Logo.png` | bin | client-shell |  |
| `apps/desktop/src-tauri/icons/Square310x310Logo.png` | bin | client-shell |  |
| `apps/desktop/src-tauri/icons/Square44x44Logo.png` | bin | client-shell |  |
| `apps/desktop/src-tauri/icons/Square71x71Logo.png` | bin | client-shell |  |
| `apps/desktop/src-tauri/icons/Square89x89Logo.png` | bin | client-shell |  |
| `apps/desktop/src-tauri/icons/StoreLogo.png` | bin | client-shell |  |
| `apps/desktop/src-tauri/src/main.rs` | 70 | client-shell |  |
| `apps/desktop/src-tauri/tauri.conf.json` | 30 | client-shell |  |
| `apps/mobile/analysis_options.yaml` | 5 | mobile-engineer |  |
| `apps/mobile/android/.gitignore` | 14 | mobile-engineer |  |
| `apps/mobile/android/app/build.gradle.kts` | 60 | mobile-engineer |  |
| `apps/mobile/android/app/src/androidTest/kotlin/org/example/baseline_mobile/MainActivityTest.kt` | 33 | mobile-engineer |  |
| `apps/mobile/android/app/src/debug/AndroidManifest.xml` | 7 | mobile-engineer |  |
| `apps/mobile/android/app/src/main/AndroidManifest.xml` | 45 | mobile-engineer |  |
| `apps/mobile/android/app/src/main/kotlin/org/example/baseline_mobile/MainActivity.kt` | 5 | mobile-engineer |  |
| `apps/mobile/android/app/src/main/res/drawable-v21/launch_background.xml` | 12 | mobile-engineer |  |
| `apps/mobile/android/app/src/main/res/drawable/launch_background.xml` | 12 | mobile-engineer |  |
| `apps/mobile/android/app/src/main/res/mipmap-hdpi/ic_launcher.png` | bin | mobile-engineer |  |
| `apps/mobile/android/app/src/main/res/mipmap-mdpi/ic_launcher.png` | bin | mobile-engineer |  |
| `apps/mobile/android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` | bin | mobile-engineer |  |
| `apps/mobile/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` | bin | mobile-engineer |  |
| `apps/mobile/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` | bin | mobile-engineer |  |
| `apps/mobile/android/app/src/main/res/values-night/styles.xml` | 18 | mobile-engineer |  |
| `apps/mobile/android/app/src/main/res/values/styles.xml` | 18 | mobile-engineer |  |
| `apps/mobile/android/app/src/profile/AndroidManifest.xml` | 7 | mobile-engineer |  |
| `apps/mobile/android/baseline_mobile_android.iml` | 29 | mobile-engineer |  |
| `apps/mobile/android/build.gradle.kts` | 24 | mobile-engineer |  |
| `apps/mobile/android/gradle.properties` | 6 | mobile-engineer |  |
| `apps/mobile/android/gradle/wrapper/gradle-wrapper.properties` | 5 | mobile-engineer |  |
| `apps/mobile/android/settings.gradle.kts` | 26 | mobile-engineer |  |
| `apps/mobile/assets/capabilities/index.json` | 4 | mobile-engineer |  |
| `apps/mobile/baseline-mobile.md` | 11 | mobile-engineer |  |
| `apps/mobile/flutter_rust_bridge.yaml` | 3 | mobile-engineer |  |
| `apps/mobile/integration_test/notes_test.dart` | 36 | bdd-quality |  |
| `apps/mobile/ios/.gitignore` | 34 | mobile-engineer |  |
| `apps/mobile/ios/Flutter/AppFrameworkInfo.plist` | 24 | mobile-engineer |  |
| `apps/mobile/ios/Flutter/Debug.xcconfig` | 2 | mobile-engineer |  |
| `apps/mobile/ios/Flutter/Release.xcconfig` | 2 | mobile-engineer |  |
| `apps/mobile/ios/Podfile` | 43 | mobile-engineer |  |
| `apps/mobile/ios/Runner.xcodeproj/project.pbxproj` | 647 | mobile-engineer | E-L4 native |
| `apps/mobile/ios/Runner.xcodeproj/project.xcworkspace/contents.xcworkspacedata` | 7 | mobile-engineer |  |
| `apps/mobile/ios/Runner.xcodeproj/project.xcworkspace/xcshareddata/IDEWorkspaceChecks.plist` | 8 | mobile-engineer |  |
| `apps/mobile/ios/Runner.xcodeproj/project.xcworkspace/xcshareddata/WorkspaceSettings.xcsettings` | 8 | mobile-engineer |  |
| `apps/mobile/ios/Runner.xcodeproj/xcshareddata/xcschemes/Runner.xcscheme` | 119 | mobile-engineer |  |
| `apps/mobile/ios/Runner.xcworkspace/contents.xcworkspacedata` | 7 | mobile-engineer |  |
| `apps/mobile/ios/Runner.xcworkspace/xcshareddata/IDEWorkspaceChecks.plist` | 8 | mobile-engineer |  |
| `apps/mobile/ios/Runner.xcworkspace/xcshareddata/WorkspaceSettings.xcsettings` | 8 | mobile-engineer |  |
| `apps/mobile/ios/Runner/AppDelegate.swift` | 16 | mobile-engineer |  |
| `apps/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Contents.json` | 122 | mobile-engineer |  |
| `apps/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-1024x1024@1x.png` | bin | mobile-engineer |  |
| `apps/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-20x20@1x.png` | bin | mobile-engineer |  |
| `apps/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-20x20@2x.png` | bin | mobile-engineer |  |
| `apps/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-20x20@3x.png` | bin | mobile-engineer |  |
| `apps/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-29x29@1x.png` | bin | mobile-engineer |  |
| `apps/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-29x29@2x.png` | bin | mobile-engineer |  |
| `apps/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-29x29@3x.png` | bin | mobile-engineer |  |
| `apps/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-40x40@1x.png` | bin | mobile-engineer |  |
| `apps/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-40x40@2x.png` | bin | mobile-engineer |  |
| `apps/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-40x40@3x.png` | bin | mobile-engineer |  |
| `apps/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-60x60@2x.png` | bin | mobile-engineer |  |
| `apps/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-60x60@3x.png` | bin | mobile-engineer |  |
| `apps/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-76x76@1x.png` | bin | mobile-engineer |  |
| `apps/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-76x76@2x.png` | bin | mobile-engineer |  |
| `apps/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-83.5x83.5@2x.png` | bin | mobile-engineer |  |
| `apps/mobile/ios/Runner/Assets.xcassets/LaunchImage.imageset/Contents.json` | 23 | mobile-engineer |  |
| `apps/mobile/ios/Runner/Assets.xcassets/LaunchImage.imageset/LaunchImage.png` | bin | mobile-engineer |  |
| `apps/mobile/ios/Runner/Assets.xcassets/LaunchImage.imageset/LaunchImage@2x.png` | bin | mobile-engineer |  |
| `apps/mobile/ios/Runner/Assets.xcassets/LaunchImage.imageset/LaunchImage@3x.png` | bin | mobile-engineer |  |
| `apps/mobile/ios/Runner/Assets.xcassets/LaunchImage.imageset/README.md` | 4 | mobile-engineer |  |
| `apps/mobile/ios/Runner/Base.lproj/LaunchScreen.storyboard` | 37 | mobile-engineer |  |
| `apps/mobile/ios/Runner/Base.lproj/Main.storyboard` | 26 | mobile-engineer |  |
| `apps/mobile/ios/Runner/Info.plist` | 70 | mobile-engineer |  |
| `apps/mobile/ios/Runner/Runner-Bridging-Header.h` | 1 | mobile-engineer |  |
| `apps/mobile/ios/Runner/SceneDelegate.swift` | 6 | mobile-engineer |  |
| `apps/mobile/ios/RunnerTests/RunnerTests.swift` | 12 | mobile-engineer |  |
| `apps/mobile/lib/bridge/generated/api/notes.dart` | 67 | mobile-engineer |  |
| `apps/mobile/lib/bridge/generated/frb_generated.dart` | 389 | mobile-engineer | E-L2 generated |
| `apps/mobile/lib/bridge/generated/frb_generated.io.dart` | 122 | mobile-engineer | E-L2 generated |
| `apps/mobile/lib/bridge/generated/frb_generated.web.dart` | 122 | mobile-engineer | E-L2 generated |
| `apps/mobile/lib/features/notes/data/rust_capability_repository.dart` | 39 | mobile-engineer |  |
| `apps/mobile/lib/features/notes/data/rust_note_repository.dart` | 17 | mobile-engineer |  |
| `apps/mobile/lib/features/notes/domain/capability.dart` | 11 | mobile-engineer |  |
| `apps/mobile/lib/features/notes/domain/note.dart` | 11 | mobile-engineer |  |
| `apps/mobile/lib/features/notes/presentation/providers/capabilities.dart` | 14 | mobile-engineer |  |
| `apps/mobile/lib/features/notes/presentation/providers/capabilities.g.dart` | 98 | mobile-engineer | E-L2 generated |
| `apps/mobile/lib/features/notes/presentation/providers/notes.dart` | 27 | mobile-engineer |  |
| `apps/mobile/lib/features/notes/presentation/providers/notes.g.dart` | 93 | mobile-engineer | E-L2 generated |
| `apps/mobile/lib/features/notes/presentation/screens/notes_screen.dart` | 107 | mobile-engineer |  |
| `apps/mobile/lib/main.dart` | 25 | mobile-engineer |  |
| `apps/mobile/pubspec.lock` | 867 | mobile-engineer | E-L1 lockfile |
| `apps/mobile/pubspec.yaml` | 26 | mobile-engineer |  |
| `apps/mobile/rust-builder/.gitignore` | 29 | UNOWNED |  |
| `apps/mobile/rust-builder/android/.gitignore` | 9 | UNOWNED |  |
| `apps/mobile/rust-builder/android/build.gradle` | 56 | UNOWNED |  |
| `apps/mobile/rust-builder/android/settings.gradle` | 1 | UNOWNED |  |
| `apps/mobile/rust-builder/android/src/main/AndroidManifest.xml` | 3 | UNOWNED |  |
| `apps/mobile/rust-builder/cargokit/.gitignore` | 4 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/build_pod.sh` | 58 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/build_tool/analysis_options.yaml` | 34 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/build_tool/bin/build_tool.dart` | 8 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/build_tool/lib/build_tool.dart` | 8 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/build_tool/lib/src/android_environment.dart` | 195 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/build_tool/lib/src/artifacts_provider.dart` | 266 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/build_tool/lib/src/build_cmake.dart` | 40 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/build_tool/lib/src/build_gradle.dart` | 49 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/build_tool/lib/src/build_pod.dart` | 95 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/build_tool/lib/src/build_tool.dart` | 276 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/build_tool/lib/src/builder.dart` | 209 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/build_tool/lib/src/cargo.dart` | 48 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/build_tool/lib/src/crate_hash.dart` | 124 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/build_tool/lib/src/dedup_archive.dart` | 98 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/build_tool/lib/src/environment.dart` | 68 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/build_tool/lib/src/logging.dart` | 52 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/build_tool/lib/src/options.dart` | 301 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/build_tool/lib/src/precompile_binaries.dart` | 205 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/build_tool/lib/src/rustup.dart` | 149 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/build_tool/lib/src/target.dart` | 147 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/build_tool/lib/src/util.dart` | 172 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/build_tool/lib/src/verify_binaries.dart` | 84 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/build_tool/pubspec.lock` | 453 | UNOWNED | E-L1 lockfile |
| `apps/mobile/rust-builder/cargokit/build_tool/pubspec.yaml` | 33 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/build_tool/README.md` | 5 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/cmake/cargokit.cmake` | 99 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/cmake/resolve_symlinks.ps1` | 34 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/gradle/plugin.gradle` | 184 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/LICENSE` | 41 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/README` | 10 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/run_build_tool.cmd` | 91 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/cargokit/run_build_tool.sh` | 99 | UNOWNED | E-N5 vendored cargokit |
| `apps/mobile/rust-builder/ios/Classes/dummy_file.c` | 1 | UNOWNED |  |
| `apps/mobile/rust-builder/ios/gen_ui_ffi.podspec` | 44 | UNOWNED |  |
| `apps/mobile/rust-builder/linux/CMakeLists.txt` | 19 | UNOWNED |  |
| `apps/mobile/rust-builder/macos/Classes/dummy_file.c` | 1 | UNOWNED |  |
| `apps/mobile/rust-builder/macos/gen_ui_ffi.podspec` | 43 | UNOWNED |  |
| `apps/mobile/rust-builder/pubspec.yaml` | 22 | UNOWNED |  |
| `apps/mobile/rust-builder/README.md` | 0 | UNOWNED |  |
| `apps/mobile/rust-builder/upstream.md` | 9 | UNOWNED |  |
| `apps/mobile/rust-builder/windows/.gitignore` | 17 | UNOWNED |  |
| `apps/mobile/rust-builder/windows/CMakeLists.txt` | 20 | UNOWNED |  |
| `apps/mobile/test_driver/integration_test.dart` | 4 | UNOWNED |  |
| `apps/mobile/test/note_test.dart` | 11 | mobile-engineer |  |
| `apps/web/baselines/desktop/index.html` | 2 | UNOWNED |  |
| `apps/web/baselines/desktop/package.json` | 31 | UNOWNED |  |
| `apps/web/baselines/desktop/public/capabilities/index.json` | 4 | UNOWNED |  |
| `apps/web/baselines/desktop/scripts/build.mjs` | 7 | UNOWNED |  |
| `apps/web/baselines/desktop/src/features/notes/api/notes.ts` | 16 | UNOWNED |  |
| `apps/web/baselines/desktop/src/features/notes/components/notes-screen.tsx` | 15 | UNOWNED |  |
| `apps/web/baselines/desktop/src/features/notes/entities/use-note-entities.ts` | 10 | UNOWNED |  |
| `apps/web/baselines/desktop/src/features/notes/hooks/use-notes.ts` | 9 | UNOWNED |  |
| `apps/web/baselines/desktop/src/features/notes/stores/notes.ts` | 21 | UNOWNED |  |
| `apps/web/baselines/desktop/src/features/notes/types.ts` | 5 | UNOWNED |  |
| `apps/web/baselines/desktop/src/main.tsx` | 9 | UNOWNED |  |
| `apps/web/baselines/desktop/src/style.css` | 2 | UNOWNED |  |
| `apps/web/baselines/desktop/src/vite-env.d.ts` | 1 | UNOWNED |  |
| `apps/web/baselines/desktop/tsconfig.json` | 20 | UNOWNED |  |
| `apps/web/baselines/desktop/vite.config.ts` | 3 | UNOWNED |  |
| `apps/web/index.html` | 2 | client-shell |  |
| `apps/web/package.json` | 30 | client-shell |  |
| `apps/web/public/capabilities/index.json` | 4 | client-shell |  |
| `apps/web/scripts/build.mjs` | 7 | UNOWNED |  |
| `apps/web/src/features/notes/api/notes.ts` | 17 | UNOWNED |  |
| `apps/web/src/features/notes/components/notes-screen.tsx` | 15 | UNOWNED |  |
| `apps/web/src/features/notes/entities/use-note-entities.ts` | 10 | UNOWNED |  |
| `apps/web/src/features/notes/hooks/use-notes.ts` | 9 | UNOWNED |  |
| `apps/web/src/features/notes/stores/notes.ts` | 21 | UNOWNED |  |
| `apps/web/src/features/notes/types.ts` | 5 | UNOWNED |  |
| `apps/web/src/main.tsx` | 9 | client-shell |  |
| `apps/web/src/style.css` | 2 | client-shell |  |
| `apps/web/src/vite-env.d.ts` | 1 | client-shell |  |
| `apps/web/tests/restart.mjs` | 52 | UNOWNED |  |
| `apps/web/tsconfig.json` | 20 | client-shell |  |
| `apps/web/vite.config.ts` | 3 | client-shell |  |
| `Cargo.toml` | 16 | build-platform |  |
| `crates/capabilities/index.json` | 4 | architect |  |
| `crates/gen-ui-db/Cargo.toml` | 7 | architect |  |
| `crates/gen-ui-db/src/lib.rs` | 66 | architect |  |
| `crates/gen-ui-ffi/Cargo.lock` | 940 | architect | E-L1 lockfile |
| `crates/gen-ui-ffi/Cargo.toml` | 11 | architect |  |
| `crates/gen-ui-ffi/src/api/mod.rs` | 2 | architect |  |
| `crates/gen-ui-ffi/src/api/notes.rs` | 47 | architect |  |
| `crates/gen-ui-ffi/src/frb_generated.rs` | 430 | architect | E-L2 generated |
| `crates/gen-ui-ffi/src/lib.rs` | 3 | architect |  |
| `crates/gen-ui-notes/Cargo.toml` | 11 | architect |  |
| `crates/gen-ui-notes/examples/notes.rs` | 14 | architect |  |
| `crates/gen-ui-notes/src/lib.rs` | 47 | architect |  |
| `crates/gen-ui-notes/tests/it.rs` | 42 | architect |  |
| `crates/gen-ui-types/Cargo.toml` | 7 | architect |  |
| `crates/gen-ui-types/src/lib.rs` | 32 | architect |  |
| `crates/README.md` | 16 | architect |  |
| `services/bff/baseline-web.md` | 11 | build-platform |  |
| `services/bff/capabilities/index.json` | 4 | build-platform |  |
| `services/bff/Cargo.toml` | 13 | build-platform |  |
| `services/bff/README.md` | 8 | build-platform |  |
| `services/bff/src/main.rs` | 87 | build-platform |  |
