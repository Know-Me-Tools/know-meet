# Flutter a11y-gate checklist (c12, task 12.3)

The `a11y-gate` skill's WCAG 2.2 AA checklist, mapped to the test or source
that covers each item in `apps/mobile`. Nothing here has run yet: the tests
are written in c12 and run once at the c13 boundary (VLBV). An item is only
**passed** when its test output is recorded there.

| Checklist item | How it is covered | Where |
| --- | --- | --- |
| Contrast ≥ AA in both themes | `textContrastGuideline` on every in-scope state, dark and light, at 375 | `kmA11yGate` in `test/support/km_a11y.dart`, called from each `test/features/*/*_screens_test.dart` and `test/a11y/frame_a11y_test.dart` |
| Every actionable element has an accessible name | `labeledTapTargetGuideline` on every state; kit controls require a label (`KmButton.label`, `KmIconButton.label`) and wrap shadcn buttons in `Semantics(button, label, onTap)` | `lib/shared/ui/km_button.dart`, `km_controls.dart`, `km_page.dart`; `kmA11yGate` |
| Target size ≥ 24×24 (2.5.8); 44 recommended | `MinimumTapTargetGuideline(24×24)` on every state; primary controls are 44px as in the prototype, small buttons 36px, crumbs 24px | `wcagTargetSizeGuideline` in `km_a11y.dart` |
| Keyboard reachable, logical order, no trap, visible focus | Tab order through the frame (skip link → brand → start → theme → sign in/account → menu), skip link moves focus to main, Escape closes the account menu and returns focus | `test/a11y/frame_a11y_test.dart`; `OrderedTraversalPolicy` in `lib/app/frame/km_app_frame.dart` |
| Images/media labelled; decorative excluded | Brand mark, avatars, glyphs and orbs are `ExcludeSemantics`; the adjacent text names the person or agent. The stubbed player's control is "Play recording" | `km_brand.dart`, `km_avatar.dart`, `km_orb.dart`, recordings feature |
| Reduced motion honoured | Every in-scope state settles with no running animation under `disableAnimations`; the nav menu appears without animation; the room's dots animate only when motion is allowed | `test/a11y/reduced_motion_test.dart`, `frame_a11y_test.dart`, `test/features/meeting_room/meeting_room_screens_test.dart`; `KmMotion`, `KmPopIn`, `KmOrb` |
| Live regions announce status | The room's "You joined" notice and field errors are `liveRegion` semantics | `km_fields.dart`, meeting_room feature |
| Status not by colour alone | Chips carry text; status pips sit next to a text label; the selected tab, segment and destination are announced as selected | `km_surfaces.dart` (`KmChip`), `km_controls.dart`, `km_nav_bars.dart` |
| Large text does not overflow | **Not covered yet.** No test pumps a text scale above 1.0; recorded as an open item for c13 | — |

Navigation placement (mobile-navigation skill) is checked in the same file:
bottom bar below 600px, rail at 600px and wider, selection derived from the
route.
