# Gate 16.4: accessibility and A2UI in the real Tauri WKWebView, with trusted OS input

Change `c16-agentic-core-gates`, gate 16.4. Date: 2026-11-10. Role: bdd-quality. Spike VLBV exception
(`spikes/agentic-ui/**`). Nothing committed.

## Verdict

| Prototype | a11y checks (8) | A2UI golden surfaces (8) | Keyboard-only A2UI form submit | Collector conformance of the a11y scenarios | VoiceOver |
|---|---|---|---|---|---|
| **O** (gate-16.1 scheduler build) | **8 / 8 pass** | **8 / 8 pass** | pass | 4 / 5 (`run-error` fails: smart quote in the typed prompt, see finding F2) | **7 / 8 steps pass; 1 partial** (failed form submit is silent, F6) |
| **H** (c15 build, fallback comparison) | **8 / 8 pass** | **8 / 8 pass** | pass | 4 / 5 (same `run-error` cause) | **6 / 8 pass; 2 partial** (F6 by pointer; keyboard failed submit not exercised) |

- All keyboard and pointer input was trusted OS-level input: CoreGraphics HID events from
  `km-input` (`isTrusted == true`). Every logged key and click was trusted. The agent counts any
  untrusted click as a failure, and it counted none.
- axe-core 4.14.0 (WCAG 2.0–2.2 A/AA) ran at settle in every launch. It also ran idle and mid-stream
  for `long-markdown`, and while an approval was pending for `hitl-approve` and `hitl-reject`. The
  a11y scans, the pending-approval scans included, found **0 violations** for O and for H. The
  A2UI settle scans found one finding (F1), and the c15 browser runs already showed the same one.
- Focus order after every Tab matches the browser expectation (DOM order of `tabindex >= 0`
  controls) on every surface, for both prototypes.
- VoiceOver (section 5, rerun after the operator enabled AppleScript control) spoke no streamed
  tokens in either prototype: O gave 3 short announcements, H gave throttled word-count progress.
  Approval cards, run errors and A2UI labels were all spoken. One defect is shared by both
  prototypes: a failed A2UI form submit is silent (F6). H also exposes a raw tool id (F7). VoiceOver
  is off now.

## 1. Setup and candidate identity

| Item | Value |
|---|---|
| O binary | `tauri-shell/bin/km-spike-own-a11y-4327` (sha256 `8fe9cb27548ef556…`), embedding `own/dist` (`index-72uicBvS.js`, the gate-16.1 bounded-publish-scheduler build, the same dist as `own/gates/bin/km-spike-own-gate`) |
| H binary | `tauri-shell/bin/km-spike-hybrid-a11y-4327` (sha256 `ec0cccf7ea841c9f…`), embedding `hybrid/dist` (`index-DhsX1UV8.js`, c15) |
| Shell build | `tauri-shell/scripts/build-a11y-shell.ts <own\|hybrid> 4327`: apps/web CSP + `connect-src http://127.0.0.1:4327`, no media origin. The policy is the same as `build-gate-shell.ts`; only the port differs |
| Harness | a second instance, `KM_HARNESS_PORT=4327` (evil listener :4328), the same corpus (14 AG-UI, 8 A2UI, 44 hostile). Gate 16.3 kept :4317 (but see section 7) |
| Runner | `KM_HARNESS_URL=http://127.0.0.1:4327 node harness/src/webview-driver/a11y/a11y-run.ts --binary <bin> --prototype <own\|hybrid> --out <dir>` |
| Input | `harness/reports/webview-driver/km-input`, built from `trusted-input/km-input.swift`. `AXIsProcessTrusted() == true` |
| Platform | macOS 26.7.3 (25G416), WKWebView via Tauri 2.11.3. `AppleKeyboardUIMode = 0` (System Settings "Keyboard navigation" off) |
| Window | 1280×720, frontmost before every input. The runner checks the frontmost pid before each action, and the final runs logged 0 "not frontmost" warnings |

How it works: the shell installs an initialization script, `a11y-agent.ts`, which bundles axe. The
script only observes: focusin, keydown and click events (with `isTrusted`), and MutationObserver logs
of `km-live-region` text and `km-transcript` `aria-busy`. The runner sends real key presses. The
function keys are commands to the agent, delivered through the same trusted HID path: F19 posts
`document.activeElement` and state, F18 runs axe, F17 posts the logs, and F16 posts the result for
the collector's Playwright comparison (`compare.ts`). Each check family uses one fresh app launch.

## 2. Results per check

### 2.1 a11y suite (`checks/a11y.spec.ts`, 8 tests)

| # | Check (browser spec test) | O | H | Evidence (O / H) |
|---|---|---|---|---|
| 1 | axe: no WCAG 2.2 A/AA violations idle, mid-stream (at 2,000 chars) and settled | PASS | PASS | O: 0 / 0 / 0 violations. H: 0 / 0 / 0 |
| 2 | transcript `aria-busy` while streaming, not after | PASS | PASS | O: `140ms=null(idle) → 3401ms=true(running) → 9231ms=null(finished)`. H: `198ms=null → 3550ms=true → 9375ms=null` |
| 3 | streaming text not inside a live region | PASS | PASS | 200-char sample: streaming message present, no live ancestors |
| 4 | live-region announcements throttled and finalized | PASS | PASS | O: 1 announcement in 5.8 s (budget 9), final 180 chars. H: 6 in 5.8 s (budget 9), final 219 chars |
| 5 | streaming and a new approval never steal focus, plus axe with an approval pending | PASS | PASS | Focus stayed in `km-composer-input` through settle, with 0 app-made focus moves. axe with 1 pending approval: 0 violations (both) |
| 6 | approval can be approved from the keyboard (Tab to it, then **Enter**) | PASS | PASS | Trusted `Enter` on `#km-approval-approve`. A new request followed, the card became `approved`, and focus stayed on the button (not `<body>`) |
| 7 | approval can be rejected from the keyboard (Tab to it, then **Space**) | PASS | PASS | Trusted `" "` on `#km-approval-reject`. The card became `rejected` and focus stayed on the button |
| 8 | run errors use `role=alert` | PASS | PASS | O: 1 visible alert, "The assistant hit an error (RECORDING_UNAVAILABLE): The recording store is unavailable." H: 1 visible alert |

Accessible names: O "Approve" / "Reject". H "Approve and send" / "Reject". Both match the spec's
`/approve/i` and `/reject|deny|decline/i`.

### 2.2 A2UI golden surfaces (`checks/a2ui-surfaces.spec.ts`, all 8)

Each surface was checked for:

- collector conformance at the first settle;
- the expected visible text and the data model;
- that no blocked media URL was requested, and no request reached the evil origin;
- every golden interaction, with trusted pointer clicks and typing, checking the emitted
  action's name, `surfaceId`, `sourceComponentId` and context;
- a trusted Tab cycle compared with the DOM tab order.

| Surface | O | H | Interactions / actions observed | Tab reach (expected = DOM order) |
|---|---|---|---|---|
| button-actions-roundtrip | PASS | PASS | Accept → `consent_accept {"meetingId":"m-981","scope":"audio+video"}`; Decline → `consent_decline {"meetingId":"m-981"}` | accept_btn, decline_btn, in order |
| card-with-action | PASS | PASS | Add the agent → `add_agent {"agentId":"scribe"}` | add_btn |
| form-validation | PASS | PASS | An invalid email sends no action and shows "Enter a valid email". A valid form → `invite_guest {"email":"ana@know-me.tools","name":"Ana","role":["guest"]}` | name, email, phone, role_picker, agree_box, submit_btn, in order |
| incremental-update-delete | PASS | PASS | none (no focusable A2UI controls) | none expected |
| list-template | PASS | PASS | none | none expected |
| media-image-video-audio | PASS | PASS | Blocked media never requested; 0 evil-origin hits | video `clip`, audio `voice` (native media controls) |
| nested-layout | PASS | PASS | none | tabs (Agenda, Notes), modal_trigger, in order |
| unknown-component-fallback | PASS | PASS | none | none expected |

**Keyboard-only form submit** (form-validation, no pointer after the prompt): Tab to each field,
trusted typing, Space on `agree_box`, Tab to `submit_btn`, Enter. O and H both sent
`invite_guest` with the exact golden context. Every key was trusted (O 18 keys, H 17; H has one fewer Tab stop because its ChoicePicker is a radio group).

### 2.3 Collector conformance (the a11y scenarios, judged by `compare.ts`)

| Scenario | O | H |
|---|---|---|
| long-markdown | PASS | PASS |
| hitl-approve | PASS | PASS |
| hitl-reject | PASS | PASS |
| run-error | **FAIL** | **FAIL** |
| A2UI scenarios (8) | PASS (judged inside each surface check) | PASS |

`run-error`: `messages[0].text: expected "Fetch last week's recording.", got "Fetch last week’s recording."`.
The prompt was typed with trusted keys, and WKWebView replaced the ASCII apostrophe with U+2019
before the app read the field (finding F2). The a11y check for this scenario (#8) passes. The
mismatch is in the user-text echo, not in the prototype's rendering.

## 3. Focus traces (trusted Tab; `document.activeElement` after each key, read by the F19 probe)

Browser expectation: the DOM order of `tabindex >= 0` elements (Playwright `p.tabTo` presses Tab
until the target is active). In Tauri, pressing Tab from the composer reaches `Send`, then the
document itself (`<body>`) once, then wraps to the top of the transcript. WKWebView puts the
document in that wrap step; Chromium passes through browser chrome at the same point instead. The
order of the controls is unaffected.

**O, hitl-reject** (reference DOM order: `summary "Arguments"`, `#km-approval-approve`, `#km-approval-reject`, `#km-composer-input`, `#km-composer-submit`):

```
1. Tab -> button[type=submit]#km-composer-submit "Send"
2. Tab -> body
3. Tab -> summary "Arguments"
4. Tab -> button[type=button]#km-approval-approve "Approve"
5. Tab -> button[type=button]#km-approval-reject "Reject"      -> Space: card rejected, focus stays here
```

**H, hitl-reject** (H's card has no `<summary>` disclosure):

```
1. Tab -> button[type=submit]#km-composer-submit "Send"
2. Tab -> body
3. Tab -> button[type=button]#km-approval-approve "Approve and send"
4. Tab -> button[type=button]#km-approval-reject "Reject"      -> Space: card rejected, focus stays here
```

**O, A2UI form-validation** (H is the same except for `role_picker`, see below):

```
1. Tab -> button[type=submit]#km-composer-submit "Send"
2. Tab -> body
3. Tab -> input[type=text]#a2ui:name_field "Name"
4. Tab -> input[type=text]#a2ui:email_field "Email"
5. Tab -> input[type=text]#a2ui:phone_field "Phone (optional)"
6. Tab -> input[type=checkbox]#a2ui:role_picker "Guest"
7. Tab -> input[type=checkbox]#a2ui:role_picker "Co-host"
8. Tab -> input[type=checkbox]#a2ui:agree_box "Guest may be recorded"
9. Tab -> button[type=button]#a2ui:submit_btn "Send invite"
10. Tab -> input[type=text]#km-composer-input "Message"
```

The two prototypes render `role_picker` differently. O renders the ChoicePicker as checkboxes, two
Tab stops. H renders it as a radio group, one Tab stop (`input[type=radio] "Guest"`). Both follow
DOM order.

**O and H, nested-layout:**
`Send → body → button#a2ui:root "Agenda" → button#a2ui:root "Notes" → button#a2ui:modal_trigger "Details" → composer`.

**O and H, media-image-video-audio:**
`Send → body → video#a2ui:clip (×2) → audio#a2ui:voice (×2) → composer`. A second Tab stays on the
same media element because it moves through the element's native control shadow parts. The runner
logs this as "pressed again".

**Option+Tab (diagnostic, not judged).** With `AppleKeyboardUIMode = 0`, a plain Tab in this Tauri
WKWebView reached buttons, checkboxes, radios and `<summary>`. Option+Tab did the inverse: it
reached only text fields (name, email, phone, composer) and skipped every button. For keyboard
users this is the opposite of Safari's documented default. The full Option+Tab traces are in the
results JSON.

## 4. axe results

| Launch | O | H |
|---|---|---|
| long-markdown idle / mid-stream / finished | 0 / 0 / 0 | 0 / 0 / 0 |
| hitl-approve, approval pending (focus run and approve run) | 0, 0 | 0, 0 |
| hitl-reject, approval pending | 0 | 0 |
| run-error, settled (`error`) | 0 | 0 |
| A2UI: incremental-update-delete, list-template, media, nested-layout, unknown-component-fallback (settled) | 0 each | 0 each |
| A2UI: button-actions-roundtrip, card-with-action, form-validation (settled) | **1 each: `color-contrast` (serious), 1 node** | **1 each: `color-contrast` (serious), 1 node** |

**F1.** The failing node is always the label of the A2UI `Button` with `variant: "primary"`:

- O: `p[data-a2ui-id="accept_label"]`, `add_label`, `submit_label`;
- H: `span[data-a2ui-id="accept_label"]`, `add_label`, `submit_label`.

This matches the c15 result (`comparison.md` line 284: one `color-contrast` node on
`a2ui-over-agui` in both prototypes). It belongs to the A2UI primary-button tokens, not to the
WKWebView. The browser A2UI spec (`a2ui-surfaces.spec.ts`) does not run axe, so this finding does
not fail the surface checks. It needs a design-token fix (design-lead / ui-engineer).

## 5. VoiceOver

### 5.1 How it was captured

- The operator enabled VoiceOver Utility → "Allow VoiceOver to be controlled with AppleScript".
  `/private/var/db/Accessibility/.VoiceOverAppleScriptEnabled` now exists, and `content of last
  phrase` returns text (`raw/voiceover/preflight.log`: "Welcome to macOS. VoiceOver is on.").
  `bounds of vo cursor` still returns `missing value`; it was not needed.
- VoiceOver ran with default verbosity and default key echo (characters and words). It was started
  with `VoiceOverStarter` and stopped with AppleScript `quit`.
- `vo-poll.js` (JXA) polled `lastPhrase.content()` every ~90 ms and logged each change with an epoch
  timestamp: about 1,030 polls per prototype run, 0 errors.
- `vo-run.sh` ran the unchanged procedures (`a11y-run.ts --only stream,focus,approve,reject,alert,
  a2ui/form-validation,a2ui-keyboard`) against my own harness on :4327, with trusted km-input keys
  and clicks.
- `vo-merge.mjs` merged the runner timeline with the phrases into `transcript.txt`.
- `vo-form.sh` / `harness/.../vo-form-probe.ts` is a supplementary keyboard-only form probe. It
  submits with an invalid email, pauses 3 s, fixes the email, then submits again and pauses 5 s.
  Only O ran (section 5.4).
- Navigation used Tab/Enter/Space, not VO-key commands, so VoiceOver followed keyboard focus.
  Reading the transcript with the VO cursor was not tested.

**Capture limits.** The poller only sees the *last* phrase:

- A phrase that VoiceOver interrupts within one poll interval can be missed. For example, the Tab
  stop on `<body>` and some "Send" stops were not heard.
- The same phrase spoken twice in a row looks like one.
- The capture has no audio and no speech timing.

### 5.2 Verdict per step

The contract column cites `harness/contract.md` §6 (or §4 for `role=alert`). "Beyond contract" means
§6 says nothing about that step; it is judged by WCAG 3.3.1/4.1.3 practice.

| Step | Contract | O | H |
|---|---|---|---|
| 1. Stream a long answer (`long-markdown`) | §6 throttled live region, final ≤300 chars, no streaming text in a live region | **PASS**. 3 phrases in ~6 s, no token text (5.3a) | **PASS**. 6 progress phrases in 5.4 s, then the final; no token text. At the ~1/s ceiling (F8) |
| 2. `aria-busy` transitions | §6 busy while streaming | **PASS (indirect)**. VoiceOver does not speak `aria-busy`. Nothing from the busy transcript was read; the VO cursor stayed on the composer ("You are currently on a text field…" mid-stream) | **PASS (indirect)**, same observation |
| 3. Approval card appears | §6 must not move focus | **PASS**. "Approval needed: Send the meeting summary to 4 attendees?" via the live region; focus and VO cursor stayed in the composer | **PASS**. "The assistant needs your approval to continue." It does not say *what* needs approval (F8) |
| 4. Tab to Approve/Reject, activate | §6 focus after decision not `<body>` | **PASS**. "Arguments collapsed summary Assistant article" → "Approve button Approval request group" → "Reject button". Enter → "Assistant replied: Sent the summary to 4 attendees."; Space → "Assistant replied: OK, I did not send the email." | **PASS**, with defect F7: "Approve and send button Tool send_summary_email region" → "Reject button"; replies as in O |
| 5. Run error (`role=alert`) | §4 alert in the transcript | **PASS**. Spoken immediately: "The assistant hit an error (RECORDING_UNAVAILABLE): The recording store is unavailable." | **PASS**. "The assistant stopped with an error (RECORDING_UNAVAILABLE). The recording store is unavailable." |
| 6. A2UI form: labels and roles | beyond contract (4.1.2) | **PASS**. "Name edit text Interactive card region", "Email edit text", "Phone (optional) edit text", "Guest checked checkbox Role group", "Co-host unchecked checkbox", "Guest may be recorded unchecked checkbox", "Send invite button" | **PASS**. The same, except "Guest selected radio button, 1 of 2 Role group" |
| 7. A2UI validation messages | beyond contract (3.3.1, 4.1.3) | **PARTIAL (F6)**. The message is associated: "Email description, Enter a valid email … invalid data". A failed submit is **silent**: Enter on "Send invite" with an invalid email gave no phrase; focus stayed on the button; no action was sent. O also validates on the first keystroke ("no Email Enter a valid email edit text invalid data") | **PARTIAL (F6, pointer only)**. Clicking Send invite gave only the button read "Send invite description, Complete the form first button"; the error was heard only on returning to the field. No error was heard while typing. Keyboard failed submit **not exercised** (5.4) |
| 8. A2UI submit | beyond contract | **PASS**. Enter on a valid form → "Assistant replied: Received action invite guest." (form probe); focus stays on the button | **PARTIAL**. Pointer submit → "Assistant replied: Received action invite guest." The keyboard run closes the app ~0.5 s after Enter, so its announcement was not captured |

### 5.3 Transcript excerpts (seconds from the procedure start; key-echo letters omitted)

**a. O, long-markdown** (`raw/voiceover/own/transcript.txt`)

```
 5.87s "Summarise the whole meeting in detail."
 5.95s "Assistant is responding."
 9.97s "You are currently on a text field. To enter text in this field, type."
10.91s "Still responding…"
11.77s "Assistant replied: Meeting summary: agentic UI spike review This is a long, deliberately varied answer used to measure streaming cost. 1. Decisions part 1 The team reviewed decisi…"
14.36s RUN PASS a11y-1..a11y-4, conformance long-markdown
```

**b. H, long-markdown** (`raw/voiceover/hybrid/transcript.txt`)

```
 6.28s "Assistant is responding, 1 words so far."
 6.88s "Assistant is responding, 653 words so far."
 8.04s "Assistant is responding, 1304 words so far."
 9.14s "Assistant is responding, 1954 words so far."
10.24s "Assistant is responding, 2597 words so far."
11.35s "Assistant is responding, 3274 words so far."
11.70s "Assistant replied: Meeting summary: agentic UI spike review … Discussion covere…"
```

**c. O, hitl-reject** (keyboard; H is in the hybrid transcript)

```
5.30s "Email the meeting summary to everyone who attended."
5.39s "Assistant is responding."
5.64s "Approval needed: Send the meeting summary to 4 attendees?"
6.42s "Message Ask about this meeting… edit text"          (click into the composer)
7.10s "Arguments collapsed summary Assistant article"        (Tab)
7.44s "Approve button Approval request group"               (Tab)
7.78s "Reject button"                                       (Tab, then Space)
8.21s "Assistant is responding."
8.39s "Assistant replied: OK, I did not send the email."
```

**d. O, run-error**

```
4.58s "Fetch last week’s recording."
4.67s "The assistant hit an error  (RECORDING_UNAVAILABLE) :  The recording store is unavailable."
```

**e. O, keyboard-only form probe** (`raw/voiceover/own-form/transcript.txt`)

```
 8.38s "Name edit text Interactive card region"                        (typed Ana)
10.01s "Email edit text"
10.86s "no Email Enter a valid email edit text invalid data"            (after 2 typed letters)
14.21s "Send invite button"
14.88s MARK Enter on submit_btn with invalid email
16.15s "You are currently on a button. To click this button, press Control-Option-Space. …"   (VO idle hint; nothing else)
18.13s MARK after invalid submit: active=button#a2ui:submit_btn "Send invite"; actions sent=0; "Enter a valid email" visible=true
19.94s "not-an-email contents selected Email Enter a valid email invalid data edit text"   (Shift+Tab back)
24.97s "checked Guest may be recorded checkbox"
26.07s "Send invite button"
26.79s MARK Enter on submit_btn with valid form
27.18s "Assistant replied: Received action invite guest."
```

### 5.4 Interruptions and what was not exercised

- **Form probe attempt 1 (O)** (`raw/voiceover/own-form-attempt1-not-frontmost/`).
  - The Tauri app launched in the background ("km-spike-own-a11y-4327 is launched in the
    background"), and Messages had keyboard focus. Someone was using the Mac.
  - Input sent: one trusted refocus click at the app window's computed right edge, which may have
    landed on another window, and F19 probe keys. The F19 probe never reached the page, so the probe
    aborted before typing anything.
  - VoiceOver echoed no characters (it reads an existing Messages draft at 5.57 s), so no text was
    typed into another application.
- **Response.**
  - VoiceOver was turned off at once.
  - `a11y-session.ts` `front()` now throws when `KM_STRICT_FRONT=1` and the app is not frontmost,
    instead of only warning.
  - I waited for 60 s of no HID input before retrying.
- **Form probe attempt 2 (O).** All steps were captured. Then BrowserOS became frontmost (29.9 s),
  and the strict guard refused the next input, so the final `F17` log post did not run.
- **Not exercised.**
  - The H keyboard-only failed submit: the machine was in active use, so it was not run.
  - The H keyboard submit announcement.
  - VO-cursor reading of the transcript while `aria-busy`.

### 5.5 Other observations (both prototypes)

- On every launch VoiceOver says "km-spike-…-a11y-4327 is not responding" ~0.4 s after the window
  appears. The shell's main thread is busy at start. The driver injects a script that bundles axe,
  so recheck without the driver agent before calling this a shell defect.
- The full prompt is spoken once when it is submitted (e.g. "Email the meeting summary to everyone
  who attended."). The source, the transcript insertion or the composer clearing, was not
  isolated.
- The error code is read literally: "(RECORDING_UNAVAILABLE)" (F9).

## 6. Findings

- **F1. A2UI primary-button label contrast** (`color-contrast`, serious) in both prototypes; see section 4.
  Owner: design tokens.
- **F2. WKWebView applies smart-quote substitution to `<input>` typing.** A trusted `'` arrived as
  `’`. Chromium does not substitute (c15 conformance passed there).
  - Effects: users' prompts change silently, and harness conformance for prompts with an apostrophe
    fails in Tauri when the prompt is typed.
  - Options for the desktop shell: an `autocorrect`/`spellcheck` policy on the composer, normalising
    on submit, or accepting the change as user-intended typography. A decision for client-shell.
- **F3. Plain Tab reaches every control, and Option+Tab only text fields** (section 3), with the
  system Keyboard-navigation setting off. This is good for keyboard users: it matches the Chromium
  expectation. It differs from Safari's default. Retest if Tauri/wry changes WKWebView preferences.
- **F4. Live-region strategy differs.**
  - O: one `role=status` region. It says "Assistant is responding." once, then the final summary
    (1 mid-stream announcement in 5.8 s).
  - H: an `aria-live=polite` region with no role. It gives progress updates ("1 words so far"; 6 in
    5.8 s) and then the final summary.
  - Both are within the throttle budget. O is quieter.
- **F5. Focus after a decision** stays on the pressed button in both prototypes. The button is not
  removed and focus does not drop to `<body>`.
- **F6. A failed A2UI form submit is silent for screen-reader users (O and H).**
  - The error text is visible and programmatically tied to the field (`aria-invalid`, description).
  - Pressing Send invite while invalid announces nothing, keeps focus on the button and gives no
    pointer to the bad field. A VoiceOver user hears no response.
  - O also validates on the first keystroke, so the error is read while the user is still typing.
  - Fix options: move focus to the first invalid field on a failed submit, or announce a summary
    through the existing polite live region. Validate on blur or submit. Owner: A2UI renderer (ui-engineer).
- **F7. H exposes a raw tool id in an accessible name.** "Tool send_summary_email region" is read when
  tabbing to Approve. Use the human title. O's equivalent is "Approval request group".
- **F8. H live-region copy.**
  - Progress updates are spoken every ~1.1 s for the whole stream, which keeps VoiceOver talking
    nearly continuously. That is within the contract's ~1/s ceiling, but O's "responding / still
    responding / replied" pattern is far quieter.
  - "1 words so far" is ungrammatical.
  - "The assistant needs your approval to continue." does not say what needs approval. O says
    "Approval needed: Send the meeting summary to 4 attendees?"
- **F9. Error codes are spoken** ("RECORDING_UNAVAILABLE") in both prototypes. Keep the code out of
  the accessible text, or give it a human label.

## 7. Attempts, fixes and cleanup

| Attempt | Where | Outcome |
|---|---|---|
| Run 1 (previous, interrupted session; O on the :4317 shell) | `raw/*.jsonl`, `raw/own-run.log` | Partial. approve: F19 probe timeout. form-validation: Tab trace cut short. a2ui-keyboard: `fetch failed` (harness :4317 unavailable). 5 surfaces never ran. Superseded, kept as original evidence |
| Run 2 (O, :4327) | `raw/run-2-own/` | 11 / 16 + 1 error. (a) stream: the F18 axe timed out. Cause: the agent ran axe concurrently with the automatic mid-stream scan, and axe rejects concurrent runs, so no state was posted. (b) The Tab-reach check judged Option+Tab, assuming Safari semantics; Tauri does the inverse (F3), so the judgment was wrong. Both were harness defects |
| Fixes | `a11y-agent.ts`: axe runs serialized. `a11y-procedures.ts`: reach judged by plain Tab as in the browser spec, Option+Tab recorded as a diagnostic, aria-busy and live-region transitions added to every outcome | No production code was touched |
| **Run 3 O** | `raw/run-3-own/` (`own-results-mwbmf6cm.json`, 16 JSONL, `own-run.log`) | 20 / 21 outcomes (8 a11y, 8 surfaces, keyboard form, 4 / 5 conformance) |
| **Run 3 H** | `raw/run-3-hybrid/` (`hybrid-results-mwbmik2s.json`, 16 JSONL, `hybrid-run.log`) | 20 / 21, same shape |
| VoiceOver, first attempt | `raw/voiceover-probe-*.log` | BLOCKED (`-1728`, AppleScript control off) |
| VoiceOver O, attempt 0 | `raw/voiceover/own-attempt0-enoent/` | Runner error: relative binary path (ENOENT), nothing launched |
| **VoiceOver O** | `raw/voiceover/own/` (`transcript.txt`, `vo-phrases.jsonl`, `run.log`, 7 JSONL, `own-results-mwbo452m.json`) | 13 / 14 procedures pass with VoiceOver on (same `run-error` F2), transcript captured |
| **VoiceOver H** | `raw/voiceover/hybrid/` (same files, `hybrid-results-mwbo6wcp.json`) | 13 / 14, transcript captured |
| VoiceOver O form probe, attempt 1 | `raw/voiceover/own-form-attempt1-not-frontmost/` | Aborted: app not frontmost, someone using the Mac (section 5.4) |
| **VoiceOver O form probe** | `raw/voiceover/own-form/` | All steps captured; stopped by the strict frontmost guard after the last step |

Cleanup and incidents:

- All Tauri apps exited; each one was stopped after its procedure. VoiceOver is off.
- The :4327 harness instance was stopped.
- VoiceOver rerun (this session): my :4327 harness (pid 8370) was stopped by its PID. Gate 16.3's
  :4317 harness (pid 86763) and `paired-measure.ts` (pid 52174) were not touched; :4317 was still
  listening afterwards. VoiceOver was turned off when the machine turned out to be in use, and again
  after the form probe. No Tauri app, poller or runner is left running.
- **Incident:** while stopping the :4327 instance, a `pkill -f "node src/server/main.ts"` also
  terminated gate 16.3's :4317 harness at about 22:34:25 CST. I restarted it at once with the same
  command (`node src/server/main.ts` in `harness/`, default port), and it was listening again at
  22:34:31. Gate 16.3's `paired-measure.ts` (pid 52174, started 22:20) was running against it. Its
  sessions in flight during that window lost their in-memory server state. **Gate 16.3 should
  check its results for errors around 22:34 and rerun the affected pairs.**

## 8. Files

- Report and probe: `measurements/16-4/16-4-tauri-a11y.md`, `measurements/16-4/voiceover-probe.sh`
- Raw evidence: `measurements/16-4/raw/` (run 1), `raw/run-2-own/`, `raw/run-3-own/`, `raw/run-3-hybrid/`,
  `raw/voiceover-probe-own.log`, `raw/voiceover-probe-dictionary.log`, `raw/voiceover/` (VoiceOver
  rerun: `own/`, `hybrid/`, `own-form/`, failed attempts, `preflight.log`, `poll-selftest.jsonl`,
  `harness-4327.log`)
- VoiceOver tooling: `measurements/16-4/vo-poll.js`, `vo-run.sh`, `vo-form.sh`, `vo-merge.mjs`,
  `harness/src/webview-driver/a11y/vo-form-probe.ts`; `a11y-session.ts` gained the
  `KM_STRICT_FRONT=1` frontmost guard
- Driver changes: `harness/src/webview-driver/a11y/a11y-session.ts` (`KM_HARNESS_URL`),
  `a11y-agent.ts` (serialized axe), `a11y-procedures.ts` (plain-Tab judging, Option+Tab
  diagnostic, transition notes)
- Shell: `tauri-shell/scripts/build-a11y-shell.ts` (new), and the binaries
  `tauri-shell/bin/km-spike-{own,hybrid}-a11y-4327` (git-ignored)
