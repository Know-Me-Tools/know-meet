# A2UI Flutter parity spike (c15, task 15.4)

A small Flutter app that loads the 8 golden A2UI 1.0 surfaces from the harness
(`../harness/corpus/a2ui/surfaces/`, copied to `assets/surfaces/`) and renders them
with the official renderer, `a2ui_flutter` 0.2.0 on `a2ui_core` 0.6.0. It uses a
minimal Know Meet catalog themed by `packages/design-tokens`. The results are in
[`results.md`](results.md).

This is a spike under the operator-approved VLBV exception (decision log 2026-11-09).
It is outside the pnpm workspace and the product tree.

## Layout

```
lib/surfaces/   golden surface model and asset loader (placeholders resolved)
lib/a2ui/       Know Meet catalog, media policy, unknown-component shim, session, AG-UI action mapping
lib/theme/      km_theme.dart; generated/ is a verbatim copy of packages/design-tokens/generated/flutter
lib/ui/         viewer app: phone list/push, tablet two-pane
test/           widget, interaction, baseline, golden and live-harness tests
evidence/       analyzer output and test transcripts for results.md
```

## Run

Toolchain: Flutter 3.47.5 and Dart 3.13.4, from `tooling/versions.toml`.

```bash
flutter pub get
flutter test                                   # 94 tests: everything except live-harness
flutter test --tags golden                     # goldens only
flutter test --tags golden --update-goldens    # only after an intended visual change
# Live action round-trip against the harness mock server:
(cd ../harness && pnpm serve) &
KM_HARNESS_URL=http://127.0.0.1:4317 flutter test test/live_harness_test.dart --run-skipped
flutter run -d macos                           # viewer; on a device add
                                               # --dart-define=KM_HARNESS_ORIGIN=http://<lan-ip>:4317
```

The goldens are tied to the machine that made them: macOS arm64 with Flutter 3.47.5,
pinned Inter, Space Grotesk, JetBrains Mono and MaterialIcons fonts, phone 390x844
and tablet 1024x1366, light and dark. `test/unit_test.dart` fails if the copied
theme drifts from `packages/design-tokens/generated/flutter`. Re-copy both files if
that happens.
