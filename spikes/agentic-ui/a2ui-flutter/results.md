# A2UI web/Flutter parity: results (c15, task 15.4)

Run on 2026-11-10 on macOS arm64 with Flutter 3.47.5 and Dart 3.13.4. The 8 golden
surfaces come from `spikes/agentic-ui/harness/corpus/a2ui/surfaces/`.

Evidence:

- `evidence/flutter-test-default.txt`: 94 passed, 1 file skipped by tag.
- `evidence/flutter-test-live-harness.txt`: 8/8 passed against the harness mock server
  on `127.0.0.1:4317`.
- `evidence/analyze.txt`: no issues.
- `test/goldens/`: 28 PNGs.

## 1. Renderer under test

| Package | Version | Published (pub.dev) | Publisher | A2UI spec |
|---|---|---|---|---|
| `a2ui_flutter` | **0.2.0** (pinned exactly) | 2026-11-09 23:18 UTC | `labs.flutter.dev` (verified) | v1.0 and v0.9 (README); basic catalog v1.0 |
| `a2ui_core` | **0.6.0** (pinned exactly) | 2026-11-09 23:17 UTC | `labs.flutter.dev` | v1.0 and v0.9 message processing |
| `genui` | 0.10.4, not used | 2026-09-29 | `labs.flutter.dev` | The README of `a2ui_flutter` says `a2ui_flutter` + `a2ui_core` + `a2ui_agent` "replace the genui package" |
| `genui_a2ui` | 0.7.0, not used | 2026-02-07 | `labs.flutter.dev` | Stale; depends on `genui` ^0.7.0 |

Repository: `a2ui-project/a2ui`, `dart/a2ui_flutter`, Apache-2.0.

**Version drift.** `contract.md` and the evaluation name `a2ui_flutter` 0.1.0 and
`a2ui_core` 0.5.0. Both moved to a new minor version one day before this run, and the
0.2.0 changelog is marked **Breaking** (it now requires `a2ui_core` ^0.6.0). I tested
the current versions. The spec is the same: the goldens' literal `"version": "1.0"` is
accepted. The `"v1.0"` spelling was not exercised.

**Toolchain.** The packages require Dart >=3.10 and Flutter >=3.38. They work on the
pinned 3.47.5 / 3.13.4. Running them headless needs a fake `video_player` platform
(`test/support/fake_video_platform.dart`), because `video_player` is a hard dependency.

## 2. What was built

- **Viewer app** (`lib/`): loads all 8 surfaces from JSON and applies their messages
  through `MessageProcessor`, then renders with `A2uiSurface`. Phone width shows a
  list and pushes a surface. Tablet width shows a two-pane view. The action log shows
  the AG-UI `forwardedProps` each action would send.
- **Know Meet catalog** (`lib/a2ui/km_catalog.dart`): the official basic v1.0 catalog
  under the same catalog id, with each builder wrapped to:
  1. key its root `Key('a2ui:<id>')`, the Flutter equivalent of `data-a2ui-id`;
  2. block Image, Video and AudioPlayer URLs outside the allowlisted origin, with a
     "Media blocked" placeholder that makes no request;
  3. add a `KmFallback` component.
- **Theme**: visuals come from `buildKmTheme` (Material 3 `ThemeData` generated from
  the design tokens: Flat 2.0, ember primary, input ring). It is not shadcn_flutter:
  the official components are hard-wired Material widgets (section 5).
- **Unknown-component shim** (`lib/a2ui/unknown_component_shim.dart`): rewrites unknown
  component types to `KmFallback` before processing, because the renderer has no
  fallback hook.
- **Baseline** (`test/native_renderer_test.dart`): the same surfaces through the plain
  `basicCatalog()`, with no wrapper, shim or policy. This records what the renderer
  does out of the box.

## 3. Parity table

Columns:

- **Web expected**: what the harness requires of `@a2ui/react` 0.15.0 /
  `@a2ui/web_core` 0.15.0 (`contract.md`, `checks/a2ui-surfaces.spec.ts`, each
  surface's `expected` and `interactions`).
- **Flutter (KM catalog)**: what this app does.
- **Flutter (out of the box)**: plain `basicCatalog()`.

The web renderer itself has not run yet: prototypes H and O (15.2, 15.3) and the web
run (15.5) are still open. The only web-side evidence today is the corpus validation
(`harness/reports/corpus-validation.json`). It shows all 7 strict-pass surfaces valid
under `@a2ui/web_core` 0.15.0, and `unknown-component-fallback` failing strict
validation on `KmHologram` as designed. The **Web expected** column is therefore the
contract, not an observed web result.

Checks per surface:

- **R**: renders with no exception and no rejected message (and no renderer error on
  strict-pass surfaces).
- **ID**: every expected component id is present.
- **FB**: fallback ids use the fallback, and no other id does.
- **TXT**: the visible text is shown.
- **DM**: final data model, and deletion where expected.
- **MED**: blocked media is never requested.
- **ACT**: golden interactions emit exactly the expected action (name, surfaceId,
  sourceComponentId, context), or none.
- **LIVE**: the action is POSTed to the harness as
  `forwardedProps.a2uiAction.userAction`, and the server logs exactly the expected
  actions with 0 unmatched (409) requests and 0 schema-invalid inputs.

| Surface | R | ID | FB | TXT | DM | MED | ACT | LIVE | Flutter (out of the box) |
|---|---|---|---|---|---|---|---|---|---|
| button-actions-roundtrip | pass | pass | pass | pass | n/a | pass | pass (2 actions) | pass | Same, except ids are not addressable |
| card-with-action | pass | pass | pass | pass | n/a | pass | pass | pass | Same, except ids are not addressable |
| form-validation | pass | pass | pass | pass | n/a | pass | pass (outcome; behaviour differs, 4.1) | pass | Same outcome |
| incremental-update-delete | pass | pass (none expected) | pass | pass | pass (+ intermediate frames) | pass | n/a | pass (initial run only) | Same |
| list-template | pass | pass | pass | pass | pass (+ row order, growth) | pass | n/a | pass (initial run only) | Same |
| media-image-video-audio | pass | pass | pass | n/a | n/a | **pass, KM policy only** | n/a | pass (initial run only) | **FAIL**: the `{{EVIL_ORIGIN}}` image is requested |
| nested-layout | pass | pass | pass | pass | n/a | pass | n/a (+ Tabs switch, Modal opens) | pass (initial run only) | Same; Modal trigger also emits its action (4.3) |
| unknown-component-fallback | pass | pass | **pass, shim only** | pass | n/a | pass | n/a | pass (initial run only) | **FAIL**: `hologram` renders nothing; siblings render; `UNKNOWN_COMPONENT_TYPE` reported; message not rejected |

**Counts, Know Meet catalog:**

- Applicable surface×check cells: **58/58 pass**. That is 8 surfaces × 6 always-on
  checks (R, ID, FB, TXT, MED, ACT), plus 2 DM and 8 LIVE.
- The live round-trip logged **4/4 expected actions** byte-equal after key sorting
  (timestamp excluded).
- Out of the box: **2 of 8 surfaces fail outright** (unknown fallback and media
  origin), and **no surface's component ids are addressable**. The renderer keys
  nodes with `NodeKey(instanceId)`, which never equals a plain `ValueKey`.

**Test totals:** 94 pass in the default run, which includes 28 goldens (7 surfaces ×
phone/tablet × light/dark). `incremental-update-delete` has no golden because it ends
deleted. The live-harness file adds 8/8.

## 4. Behavioural differences (Flutter vs web contract)

1. **Buttons with failing checks are disabled; the web contract clicks and blocks.**
   - Web (contract §3): "A Button sends nothing when its `checks` fail; it shows the
     validation messages instead."
   - `a2ui_flutter` instead sets `onPressed: null` and puts the check message
     ("Complete the form first") in a **Tooltip**, which is not visible text.
   - The golden outcome still holds: no action is sent, and "Enter a valid email" is
     visible, because it comes from the TextField's own check.
   - A web-style check that taps the button and waits for the button's own message
     would fail on Flutter.
2. **Field errors show before any input.** On first render, "Name is required" and
   "Enter a valid email" are already visible (see the `form-validation` golden). Web
   behaviour is not yet observed. If `@a2ui/react` waits for the field to be touched or
   submitted, the two renderers will look different on every form.
3. **The Modal trigger opens the sheet and also emits its action.** Tapping `Details`
   opened the modal *and* emitted `noop_open`. Over AG-UI that is a new agent run. The
   harness has no `noop_open` run, so a live client would get a **409** on that tap. The
   golden has no interaction here, so nothing asserts it yet. 15.5 should confirm what
   `@a2ui/react` does.
4. **No unknown-component fallback.** Since 0.1.0 (marked breaking), unknown,
   not-yet-arrived and cyclic components render **nothing** and take no layout space.
   The fallback API is still open upstream (a2ui-project/a2ui#2013). The error reaches
   `onError`, siblings survive, and the message is not rejected. The web contract needs a
   neutral fallback with `data-a2ui-fallback`, which here takes a transport-side shim.
5. **No media origin hook.** `Image` calls `Image.network` for any http(s) URL, and Video
   and AudioPlayer open any http(s) URL through `video_player`. The allowlist has to be
   enforced by wrapping builders. Measured out of the box, the request list contained
   `http://127.0.0.1:4318/beacon/a2ui-image.png`.
6. **No stable test or automation hook per component id.** `NodeKey` is deliberately
   unequal to app keys. The `Key('a2ui:<id>')` that `a2ui-surface.ts` assumes only
   exists because the Know Meet catalog wraps every builder. Template instances (List
   rows) share the template's id, as the surface's `flutterNotes` expects; rows were
   compared by text and order.
7. **Visual language.** The official basic components are Material 3 widgets
   (`FilledButton`, `OutlinedButton`, `Checkbox`, `RadioListTile`-style ChoicePicker,
   `TabBar`, bottom-sheet Modal). The web side plans a shadcn-mapped catalog.
   - Theming through `ThemeData` gets colours, type, radii and Flat 2.0 dividers right.
   - Component anatomy will not match shadcn without re-implementing the builders.
8. **Text and markdown.** Text renders plain unless the app wraps the surface in
   `A2uiMarkdown` with a markdown package. That is not exercised here, because no golden
   uses markdown.
9. **Accessibility.** This was not measured in 15.4. The README documents
   `accessibility.live`/`hidden` support, and says an explicit `accessibility.label` is
   *joined to* rather than *replacing* the control's own label on TextField and Text.
   That differs from a web `aria-label`.

## 5. Maturity notes

- **Status: alpha.** The A2UI roadmap lists the Flutter, SwiftUI and Compose renderers
  as Alpha, against Stable for web core, Lit, Angular and React.
  - Versions are 0.x, and the last two minor releases were both breaking: 0.1.0
    changed fallback rendering, and 0.2.0 bumped core.
  - Both packages were published the day before this run.
- **API stability.** Low.
  - `NodeView` carries `// ignore: deprecated_member_use` pointing at an open issue (#3235).
  - The fallback API is pending (#2013).
  - The package re-exports `a2ui_core` types, so every core minor version breaks the
    renderer.
  - Pin exactly and budget for churn.
- **Gaps, in priority order:**
  1. no fallback hook;
  2. no media or URL policy hook;
  3. Material-only basic catalog;
  4. disabled-button validation UX;
  5. no intrinsic sizing (README: "Not supported yet");
  6. `video_player` cannot be left out;
  7. no AG-UI transport.
     - `a2ui_flutter` processes A2UI messages only.
     - The `ACTIVITY_SNAPSHOT`/`ACTIVITY_DELTA` (`a2ui_operations`) channel and the
       `forwardedProps.a2uiAction` return path have to be written in Dart; the
       community `ag_ui` 0.3.0 was not evaluated here.
- **What is solid:**
  - Message processing matched the web expectations on every surface: data binding,
    `formatString`, templates, incremental updates, delete, and checks
    (`required`/`email`/`regex`/`and`).
  - Action payloads are spec-shaped (`A2uiRendererAction.toJson`) and passed the
    harness unchanged.
  - The custom-catalog API made every gap above fixable without forking.

## 6. Estimate to reach parity

The estimate is for one Flutter engineer, assuming the web side settles the open
behaviours (4.1 to 4.3) first. If it doesn't, the shadcn catalog row will move.

| Work | Estimate |
|---|---|
| Promote the spike's catalog wrapper, media policy and fallback shim to `apps/mobile` behind a port (A2UI renderer adapter at the edge) | 1–2 days |
| shadcn_flutter-styled builders for the 18 basic components, from tokens, with goldens (phone/tablet, light/dark) | 5–8 days |
| Align validation UX with web (click-and-show vs disabled, error timing) once 15.5 observes `@a2ui/react` | 1 day |
| AG-UI A2UI channel in Dart: `ACTIVITY_*` with JSON Patch on `a2ui_operations`, action return as `forwardedProps.a2uiAction.userAction`, reconnect | 3–5 days |
| Accessibility pass (Semantics labels and live regions against the contract §6 equivalents) | 2 days |
| Upstream tracking: re-pin and re-run this suite on each `a2ui_flutter`/`a2ui_core` minor; drop the shim when #2013 lands | ~0.5 day per release |

**Total: about 2.5–3.5 engineer-weeks to production parity**, then ongoing churn cost
while the renderer stays alpha. On the evidence here, A2UI-on-Flutter is viable for
data, actions and validation outcomes. It is not viable unwrapped: the fallback and
media gaps are product-safety issues, so the Know Meet catalog wrapper is mandatory.
