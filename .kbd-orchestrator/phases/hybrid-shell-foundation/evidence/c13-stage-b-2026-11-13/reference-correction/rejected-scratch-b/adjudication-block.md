# c13 reference correction adjudication

Date: 2026-11-13. Reviewer: independent `reference_adjudication` agent, activated
as Know Meet design-lead by delivery-lead. Operation: reference review, not a
product redesign or full application fidelity certification.

## Verdict: BLOCK this 25-image candidate

The eight schedule replacements change typography outside the approved invite
data normalization. Do not promote this candidate set. The sixteen footer
replacements and one processing replacement satisfy this narrow inspection;
that finding does not authorize partial promotion or certify VS-1.

The uncomfortable finding: a successful capture receipt with zero recorded
errors still contains visibly wrong typography. Accepting it would redefine the
reference around a capture defect and could conceal application regressions.

## Authority and scope

- Active phase: `hybrid-shell-foundation`, c13, Execute, selected method VLBV.
  Waypoint inspected at revision 259. The method-context index is revision 238;
  it is recovery context, not permission to run production verification.
- Adopted contract binding revision 4, digest
  `261ec2fd7ff96c0deaa35a4d59f8723858ecdcdeec2e417e0e090c27d7bec7b6`.
  The relevant included value is the static shell fidelity oracle; real media,
  authentication, delivery integrations and out-of-scope screens stay excluded.
- The 2026-11-13 decision-log entry and delivery-lead activation authorize only
  deterministic schedule data (8), the light/768 processing capture (1), and
  comparison-reference removal of the prototype catalog footer link (16).
- Pixel thresholds, rubric and matrix remain unchanged. Frozen defaults remain
  `maxDiffPixelRatio: 0.01`, `threshold: 0.2`. This review grants no threshold
  exception, release authority, successor phase or budget reset.
- Authorized total repair cap is 4, preserving the prior consumed lower bound
  of 3. Time/tool consumption remains unknown. This inspection runs no production
  verification and does not claim another repair cycle.
- Incumbent authority: `PRODUCT.md`, `DESIGN.md`, the project UI protocol and
  frozen prototype v2.3. Operate mode applies to schedule/processing; the home
  reference retains its incumbent landing-page composition.

## Candidate and provenance

Scratch root: `/private/tmp/km-reference-correction-20261113-b/`.
Preserved sources are in `originals/`; proposed images are in `replacements/`.
Every path below is relative to those two directories.

Receipt: `receipt.json`, captured `2026-11-13T10:44:24.077Z`, SHA-256
`3be3734e8575a8ece1d1ad269949fb5024a5e59d9fa3b4ff5cb74144c2d54027`.
The receipt binds every original and replacement image hash, source path/hash,
driver hashes, dimensions, browser and before/after observations.

Recorded Git HEAD: `3590e0a1a6bc9e02e1678115e78b35b351c7fed3`.
Browser: `158.0.8127.18`. Frozen clock: `2026-11-10T15:00:00.000Z`;
UTC, en-US, DPR 1, screenshot animations disabled, caret hidden.

Original baseline-manifest SHA-256 before and after capture, independently
matched to the current file:
`5fe258f2630cacfd71683301c8116108060f9fbf5c686baa51e86b47d4d09317`.
Original baseline-set digest:
`00d11d22e84a6f8910c8d5fb016097b26c68e1187a41e2c59c11e6960e166e5d`.
Oracle file SHA-256 at review:
`c43a2e21f35bd2a528cac249184dfe500535610cdd46d4bfb79345eb3d0c869b`.

### Exact candidate population

Each row covers **both dark and light**, except the explicitly light-only row.
This expands to exactly 25 images, with no additional states authorized.

| State / PNG basename | Widths | Images | Scoped finding |
|---|---|---:|---|
| `dashboard.schedule` / `dashboard-schedule.png` | 375, 768, 1024, 1440 | 8 | BLOCK |
| `index.default` / `index-default.png` | 375, 768, 1024, 1440 | 8 | Acceptable normalization |
| `frame.nav-bar` / `frame-nav-bar.png` | 375 | 2 | Acceptable normalization |
| `frame.nav-rail` / `frame-nav-rail.png` | 768 | 2 | Acceptable normalization |
| `frame.nav-inline` / `frame-nav-inline.png` | 1024, 1440 | 4 | Acceptable normalization |
| `recordings.processing.partner-onboarding-1014` / `recordings-processing-partner-onboarding-1014.png` | light/768 only | 1 | Acceptable correction |

## Findings

### P1 — schedule capture changes unapproved typography

Direct original/replacement inspection covered dark/375, dark/1024 and
light/1440 schedule images. The heading glyphs, body glyph widths and wrapping
change outside the invite preview. At dark/375 the introductory paragraph
changes from three lines to two; the Details panel begins about 24 pixels higher.
This cannot be caused by shortening the join URL farther down the page.
At dark/1024 and light/1440 the heading loses its incumbent Space Grotesk shape;
form labels and other text also change.

Artifact-only pixel inspection finds differences in the first 250 rows of all
eight schedule images, before the preview starts. Difference bounding boxes
within that region are identical across themes:

| Width | Changed-pixel bounding box (left, top, right, bottom) |
|---:|---|
| 375 | 16, 27, 356, 250 |
| 768 | 13, 26, 739, 250 |
| 1024 | 25, 10, 987, 242 |
| 1440 | 143, 10, 1323, 244 |

The intended URL is present:
`http://know-meet.test/join#invite?code=km-aaa-aaa`; the SMS counter changes from
231 to 215 characters. URL-dependent wrapping and counter changes are within
scope. Substituting the surrounding typography is not.

Probable mechanism, from static inspection only: the fixture changes the page
origin to `http://know-meet.test`, while the capture's `fontBaseUrl` remains the
loopback static-server origin. The static server does not emit an
`Access-Control-Allow-Origin` header for fonts. Cross-origin font rejection is
therefore a plausible cause of fallback typography. No browser diagnostic was
run to prove that cause. `document.fonts.ready`, empty `pageErrors` and empty
blocked-request arrays do not establish that the intended font faces loaded.

Return this observed failure to bdd-quality. Preserve this candidate and receipt;
a corrected candidate must retain the incumbent fonts and confine schedule
changes to the approved invite data and its resulting preview layout.

### Footer16 — removal is confined to the approved catalog link

The driver removes exactly one
`footer nav a[href="screens.html"]` containing list item per footer job. It
does not mask the screenshot, alter product files or delete product navigation.
Every record reports one removal and stable before/after capture observations.

All sixteen images match their originals pixel-for-pixel above the footer,
checked through y=8990 at 375, y=6380 at 768, y=4700 at 1024 and y=4400 at 1440.
For expanded widths the entire-image differences are confined to the removed
link rectangle: `(587,4752,691,4764)` at 1024 and
`(903,4485,1007,4497)` at 1440, in both themes and both corresponding states.

Direct visual pairs inspected: dark/1440 `index-default.png` and light/768
`frame-nav-rail.png`. The remaining footer links and prototype disclaimer stay
visible. Compact image height changes 9352 → 9304; medium changes 6613 → 6595.
These footer reflows follow removal of the list item; the content above remains
identical. Expanded dimensions remain unchanged.

### Processing1 — correct medium-width navigation and retained state

Directly inspected both light/768 processing images. The original has bottom
navigation despite medium width. The replacement has the 80px leading rail
required by DESIGN.md, and the content reflows within the remaining width.
Both images remain 768×1031. The five pipeline stages, Step 3 of 5 / Pin to IPFS,
notification email, duration, layout, destination and return action remain.

The notification toggle stays visibly checked. The receipt records
`notificationChecked: true`, track fill `rgb(193, 62, 30)`, `navClass: rail`,
fixed rail top 64 / bottom 1024, stable before/after observations, and the
`km-processing-pin=2` URL. This is the approved capture correction, not a change
to the product design.

## Inspection evidence and limits

- Ran `.agents/skills/impeccable/scripts/impeccable context --target
  tests/fidelity/src/capture/reference-correction-capture.ts`: exit 0; resolved
  PRODUCT.md and DESIGN.md. Read DESIGN.md and the applicable audit guidance.
- Loaded `prometheus-ui-ux`, `prometheus-ui-review`, `better-accessibility` and
  `ui-ux-pro-max`. The route helper returned review / Operate and the existing
  context files. Focused Pro Max UX lookup returned Font Loading guidance;
  incumbent fonts govern, and no new design direction was generated.
- Read capture source, schedule fixture, capture environment and static server.
  No vendor API was implemented or changed.
- Ran Python standard-library SHA-256 inspection of all receipt drivers,
  original/replacement PNGs, source files and current baseline originals.
  Observed output: `failures []`, `manifest preserved True`, `png counts 25 25`.
  All 25 before/after observations compare equal; receipt failures are empty.
- Used Pillow only to inspect existing image dimensions and changed-pixel
  bounds; output showed `pre-footer identical True` for all sixteen footer
  cells and the schedule bounds recorded above. Viewed the original PNG pairs
  directly with the image viewer. No image was edited or regenerated.
- No production tests, builds, imports, lint, typechecks, browser probes or
  scenario execution ran. No new full audit score, WCAG conformance claim,
  Flutter approval, Tauri certification or VS-1 pass is asserted.

Only this document was written. No baselines, oracle, prototype, token, product
or test source was changed by this reviewer. No unsolicited guards were added.
The font-loading cause remains unverified; the visible typography defect itself
is sufficient to block this candidate. Delivery-lead owns any corrected capture,
signed adoption and final whole-phase verification within the existing budget.
