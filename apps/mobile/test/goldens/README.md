# Flutter goldens (VS-3)

Scaffolding from c07; c12 wrote the golden tests and harness. The images
are generated at the c13 boundary run (`flutter test --tags golden
--update-goldens` on the pinned golden host), then approved by design-lead. The governing
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

## Coverage (c12)

All 70 in-scope inventory states have a golden declaration, in both themes
at 375 (oracle) and 768 (tablet check):

| File | States |
| --- | --- |
| `frame_golden_test.dart` | 7 `frame.*` |
| `public_golden_test.dart` | `index.default`, 5 `auth.*`, 4 `join.*` |
| `dashboard_golden_test.dart` | 9 `dashboard.*` (incl. the signed-out gate) |
| `agents_golden_test.dart` | 14 `agents.*` |
| `recordings_golden_test.dart` | 11 `recordings.*` |
| `settings_golden_test.dart` | 17 `settings.*` |
| `meeting_room_golden_test.dart` | `meet.room`, `meet.room-guest` |

`coverage_test.dart` (untagged, fast path) fails if an in-scope state has no
golden and no entry in `kmStatesNotRendered` (currently empty).

Harness: `test/support/km_golden.dart` (`kmGolden`) pumps the real
`KnowMeetApp` at the state's location (`lib/app/state_locations.dart`) with
the fonts from `FontManifest.json` loaded, DPR 1, the frozen capture clock
(2026-11-10T15:00Z) and reduced motion on (the baselines are captured with
animations disabled). App pages are full-page (the surface grows to the
scroll height); frame states and the meeting room are viewport captures.

## Known differences from the prototype (for design-lead review)

- **Navigation bar.** The mobile-navigation skill puts the five destinations
  in a bottom bar below 600px and a rail from 600px. The prototype has
  neither; it only has the app-bar menu, which is kept. Every app-page golden
  therefore has an extra 64px bar at the bottom (375) or an 88px rail (768).
- Tables that overflow 375px in the prototype (dashboard invites, agent
  activity) are stacked cards on phone.
- Fonts render through Flutter's text stack; Space Grotesk weights use an
  explicit `wght` variation (`lib/shared/ui/km_font_axis.dart`).

## Pinned golden host

Goldens are only comparable on one renderer. The CI image and its fonts are
build-platform's (request recorded in the c12 report); until it exists,
golden images must not be generated on developer machines.
