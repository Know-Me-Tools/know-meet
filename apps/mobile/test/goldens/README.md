# Flutter goldens (VS-3)

Scaffolding from c07; c12 writes the golden tests and images. The governing
rule is `tests/fidelity/oracle/flutter-golden-provenance.json` (c03, frozen).

## Rules

- **One golden per inventory state.** Name the test after the state ID from
  `docs/design/screen-inventory/route-inventory.json`, for example
  `testWidgets('dashboard.default (dark, 375)', ...)`.
- **File path mirrors the prototype baselines:**
  `test/goldens/<theme>/<viewport>/<stem>.png`, where `<stem>` is the state ID
  with `.` replaced by `-` (as in `tests/fidelity/baselines/manifest.json`).
  Phone is 375; tablet is 768.
- **Both themes**, and every golden test tagged `golden`
  (`flutter test --tags golden` is the VS-3 production entry).
- **Theme seam:** pump the real `KnowMeetApp` (or the screen under the real
  theme) inside a `ProviderScope` whose overrides include
  `goldenThemeOverrides()` from `test/support/golden_theme_override.dart`.
- **Negative control:** `flutter test --tags golden
  --dart-define=KM_GOLDEN_THEME_OVERRIDE=stock-dark` swaps in
  `ThemeData.dark()` and must fail. Any other value throws.
- **Fonts:** load the families registered in `pubspec.yaml` before pumping;
  never render with the test font (Ahem). Pin the golden host image (CI).

## Approvals

`approvals.json` is `{"approvals": [entry, ...]}` with the entry shape in the
provenance file. Only design-lead adds entries. A golden without an approved
entry for its exact sha256 makes VS-3 BLOCKED. `--update-goldens` output is
never self-approving; changing a golden, its prototype baseline or
`docs/design/tokens.json` voids the approval.
