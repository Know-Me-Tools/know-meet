# UI review: packaged screenshots of b5f7fe84 (boundary task 9.3, UI part)

Reviewer: independent-reviewer role, read-only, same model family; the prometheus-ui-review skill
file was not found in its context, so it used web-release-acceptance.md section 6 and DESIGN.md as
the rubric. Saved by the lead. Evidence: evidence/boundary-2026-11-16/playwright-packaged-20261116T140317Z.

**Verdict: BLOCK** (1 BLOCK, 0 HIGH, 2 MEDIUM, 3 LOW).

## BLOCK
- **B1. Text fields have no inner padding and a dim placeholder (about 2:1).** Home "Join with a
  code", lobby "Your name", and the not-found code field. Root cause confirmed by the lead in the
  built CSS: `packages/ui/src/styles/globals.css` scans only `@source "../components"`, while the
  shared class lives in `packages/ui/src/lib/field-control.ts`; `px-size-input-pad-x`,
  `py-size-input-pad-y` and the focus-placeholder rule are absent from the hosted CSS. Fix: add
  `@source "../lib";`. Placeholder contrast fails SC 1.4.3; axe does not check it.

## MEDIUM
- M1. "Start a new meeting" on the "You left" view renders as a ghost button; the spec asks secondary.
- M2. The screenshot matrix covers home, lobby and room (1 participant) fully; many other states
  (starting, failures, permission, reconnecting, leave dialog) have no screenshots.

## LOW
- L1. Lobby and not-found app bars show a "No account needed" chip the spec does not list.
- L2. Wordmark shown with and without text at the same width on different views.
- L3. At 375 the room title truncates the meeting code.

## Matches well
Flat 2.0 holds in both themes (no borders or outlines); room, lobby, share card, muted badge, copy
and the home hero follow the acceptance document; O-1 and O-2 are applied.
