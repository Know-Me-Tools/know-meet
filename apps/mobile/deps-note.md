# Mobile dependency pins (c07, task 7.1)

Exact pins in `pubspec.yaml`. Checked on 2026-11-09 against the pub.dev API
(`https://pub.dev/api/packages/<name>` for version and publish date,
`/score` for the licence tag). Resolved by `flutter pub get` with Flutter
3.47.5 (Dart 3.13.4), the `tooling/versions.toml` toolchain pin.

| Package                    | Pin    | Source of the pin                                                                  | Latest on pub.dev (2026-11-09) | Licence                             |
| -------------------------- | ------ | ---------------------------------------------------------------------------------- | ------------------------------ | ----------------------------------- |
| `flutter_riverpod`         | 3.3.1  | `tooling/versions.toml` `riverpod` (3.3.2+ conflicts with Freezed's analyzer line) | 3.5.0 (2026-11-06)             | MIT (generator baseline, unchanged) |
| `riverpod_annotation`      | 4.0.2  | `tooling/versions.toml` coherent set                                               | 4.0.8                          | MIT (unchanged)                     |
| `riverpod_generator` (dev) | 4.0.3  | `tooling/versions.toml` coherent set                                               | 4.0.10                         | MIT (unchanged)                     |
| `go_router`                | 18.1.3 | latest, checked in c07 (published 2026-11-04; needs Dart ^3.12, Flutter >=3.44)    | 18.1.3                         | BSD-3-Clause                        |
| `shared_preferences`       | 2.5.6  | latest, checked in c07 (published 2026-10-05; needs Dart ^3.11, Flutter >=3.41)    | 2.5.6                          | BSD-3-Clause                        |
| `flutter_lints` (dev)      | 6.0.0  | latest, checked in c07 (published 2025-05-27)                                      | 6.0.0                          | BSD-3-Clause                        |
| `shadcn_flutter`           | 0.0.55 | cand-009; latest, checked in c12 on 2026-11-11 (published 2026-10-01; needs Dart >=3.13, Flutter >=3.47) | 0.0.55                     | BSD-3-Clause                        |
| `flutter_rust_bridge`      | 2.12.0 | `tooling/versions.toml` (runtime, Dart package and codegen move together)          | not changed                    | MIT (unchanged)                     |

Riverpod is deliberately behind latest: the newer set is not validated with
Freezed here. Raise it only by changing `tooling/versions.toml` first.

`go_router` 18 pulls the decoupled `material_ui` and `cupertino_ui` packages
transitively; they resolve from pub.dev (see `pubspec.lock`).

## Code generation

The Riverpod `part` files are generated and kept in the tree (c12 ran the
generator on 2026-11-11; 16 `*.g.dart` outputs, including the three that c07
left missing: `lib/app/app_theme.g.dart`, `lib/app/app_router.g.dart` and
`lib/shared/theme_mode/presentation/theme_preference_controller.g.dart`).
After any provider change, from `apps/mobile`: `dart run build_runner build`.
build_runner 2.15 ignores `--delete-conflicting-outputs` (it prints "These
options have been removed"), so the flag is no longer needed.

FRB codegen (`flutter_rust_bridge_codegen generate`) is still deferred; VS-9
checks it regenerates without a diff.
