# @know-meet/ui curation (c08, tasks 8.1–8.2)

The kit is `packages/ui`. It holds the components the in-scope screens need (route
inventory Q-A3: home, sign-in, join, dashboard, agents, recordings, settings, the
meeting-room layout and the app frame). Each one is restyled to
`docs/design/prototype/assets/km.css` and `docs/design/live/assets/room.css`, and
themed only by `@know-meet/design-tokens`. Components that no in-scope screen needs
yet stay in `apps/web/src/presentation/components/ui`. Nothing was deleted.

The decision log says there are 65 components. The tree held 62 top-level files plus
`sidebar/`, which is one component in seven files, so 63 in all. The other two were
probably `use-mobile` and `highlighter`, which are a hook and a library, not
components.

## Wiring (8.1)

- `@know-meet/ui` package: its `exports` cover `./globals.css`, `./components/*`,
  `./lib/*` and `./hooks/*`, and package-local `#components/*`, `#lib/*` and
  `#hooks/*` imports (the shadcn monorepo layout).
- `components.json` in `packages/ui` (style `base-nova`, aliases to `#…`). In
  `apps/web/components.json`, `ui` and `utils` now point at `@know-meet/ui`, so
  `shadcn add -c apps/web` installs into the kit.
- `src/styles/globals.css` is the single stylesheet. It imports Tailwind 4,
  tw-animate-css, then the generated fonts, tokens, theme and shadcn mapping, then
  adds `@source` for the kit and the km.css base: ember focus outline, selection,
  caret, headings and the reduced-motion stop. `apps/web/src/styles/global.css` now
  imports only the kit plus its own `@source`.
- Dark mode follows the `data-theme` token switch, not a `.dark` class. Tokens are
  dark on `:root` and light on `[data-theme="light"]` (`km-meet-theme`), so the
  `dark:` variant means "not inside a light subtree". Kit components use no `dark:`
  utilities, because the tokens switch by themselves. The variant exists only so the
  uncurated components below match the active theme instead of
  `prefers-color-scheme`. Every stock `dark:` variant in the moved components
  were removed. This resolves the c06 carried item for every moved component.
- `src/lib/utils.ts` exports a token-aware `cn`, built with `createCn` from
  `cn/config`. Without it, `text-15` merges as a text _colour_ and silently drops
  `text-foreground`. `apps/web/src/presentation/lib/utils.ts` re-exports it.
- Shared class modules keep the repeated looks in one place: `lib/field-control.ts`
  for the `.input` control, and `lib/overlay-styles.ts` for the scrim and the
  dialog and sheet surfaces.

## Moved and restyled (8.2): 29 components

| Component            | Prototype source                                                            | Notes                                                                                                                                                          |
| -------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| button               | `.btn`, `.btn-primary`, `.btn-danger`, `.btn-ghost`, `.btn-sm`, `.icon-btn` | shadcn names kept: `default` = primary, `secondary`/`outline` = `.btn` (Flat 2.0: no outline), `ghost` + `icon` = `.icon-btn`. 44px by default, 36px for `sm`. |
| input                | `.input`                                                                    | 48px, card fill, D-5 1px `ring-input`; focus is a 2px ember inset ring, invalid a 2px red one.                                                                 |
| textarea             | `textarea.input`                                                            | 96px minimum, vertical resize.                                                                                                                                 |
| native-select        | `select.input`                                                              | Full width with a chevron. The prototype uses native selects for every picker.                                                                                 |
| label                | `.field label`                                                              | 14px semibold.                                                                                                                                                 |
| field                | `.field`, `.hint`, `.field-error`                                           | The error is fg text with a red icon, so colour is never the only signal. Choice cards use a fill (ember-soft when checked), not a border.                     |
| checkbox             | `.check-row` checkbox                                                       | 20px, ring-input boundary, ember when checked.                                                                                                                 |
| radio-group          | settings/agents native radios                                               | 20px, ring-input boundary, ember when checked.                                                                                                                 |
| switch               | `.switch` with D-5 colours                                                  | 48×28 track, 22px thumb, using the `switch-track`, `switch-thumb` and `switch-thumb-on` tokens.                                                                |
| card                 | `.card`, `.card-raised`, `.panel`, `.card-head`, `.stat` (`size="sm"`)      | Explicit `variant` instead of boolean props. `CardTitle` is an h3 that can be overridden with `render`.                                                        |
| badge                | `.chip-*`, `.lock-badge`                                                    | Adds `BadgePip` (8px status dot).                                                                                                                              |
| separator            | `.divider`                                                                  | 1px muted.                                                                                                                                                     |
| tabs                 | `.tabs` (default) and `.seg` (`variant="segmented"`)                        | Adds `TabsCount` (`.count`).                                                                                                                                   |
| toggle, toggle-group | `.seg button[aria-pressed]`, pressed `.icon-btn`                            | The group is the muted 4px-padded track.                                                                                                                       |
| table                | `.table-wrap`, `.table`                                                     | Scrolls inside its own surface; mono uppercase headers.                                                                                                        |
| avatar               | `.avatar`, `-sm`, `-lg`, `-ember`, `-cyan`, `.avatar-stack`                 | New `tone` prop. Muted fill inside cards and items.                                                                                                            |
| dialog               | `dialog`, `.dlg-*`                                                          | Adds `DialogBody` (the scrolling row). 560px, bg-2, radius-lg, float shadow, scrim.                                                                            |
| alert-dialog         | `KM.confirm`                                                                | Same surface as dialog. Cancel is the raised `.btn`.                                                                                                           |
| sheet                | `.sheet`, `.sheet-*`                                                        | Adds `SheetBody`. 440px, enters on `--dur-panel`/ease-out and exits on `--dur-exit`/ease-in.                                                                   |
| dropdown-menu        | `.menu`, `.menu-item`                                                       | Defaults changed to `align="end"` and `sideOffset={8}`, as in the account menu.                                                                                |
| navigation-menu      | `.appnav a`                                                                 | Pill links. The current page is ember-soft. The collapsing mobile nav is c09.                                                                                  |
| tooltip              | none (see Q2)                                                               | Uses the inverted toast treatment.                                                                                                                             |
| toast                | `.toasts`, `.toast`                                                         | Centred and inverted; timing comes from motion tokens.                                                                                                         |
| breadcrumb           | `.crumbs`                                                                   |                                                                                                                                                                |
| empty                | `.empty`, `.empty-center` (`align`)                                         | `EmptyTitle` is an h3.                                                                                                                                         |
| progress             | meet.html `.k-progress`                                                     | 4px muted track with an ember fill.                                                                                                                            |
| spinner              | `.spin`                                                                     | Runs at `--anim-spin-fast`.                                                                                                                                    |
| item                 | `.list`, `.list-row`, `.lead`, `.trail`                                     | Under 768px the trail wraps below the body.                                                                                                                    |

Imports were updated in `apps/web`: `app/app-root.tsx` (TooltipProvider) and 13
uncurated components (`attachment`, `button-group`, `calendar`, `carousel`,
`code-block`, `combobox`, `command`, `input-group`, `menubar`, `message-scroller`,
`pagination`, `questionnaire`, and in `sidebar/` the `sidebar-menu`, `sidebar-root`
and `sidebar-sections` files).

## Kept in apps/web (34): status

These are still stock shadcn base-nova styling. They now follow `data-theme` through
the kit's `dark` variant, but they are not restyled.

| Component         | Status                             | Reason                                                                                                                                                                      |
| ----------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| accordion         | not needed                         | The prototype has no disclosure lists.                                                                                                                                      |
| alert             | candidate for c11                  | The prototype's `.inline-gate` and `.rec-banner` are close; restyle when a screen uses one.                                                                                 |
| aspect-ratio      | candidate for c11                  | Room tiles (16/10) and the lobby preview (16/9).                                                                                                                            |
| attachment        | agentic overlap, operator decision | Part of the c08/8.3 AG-UI layer (blocked on c16).                                                                                                                           |
| bubble            | agentic overlap, operator decision | Same as attachment.                                                                                                                                                         |
| button-group      | not needed                         | The prototype uses `.btn-row` (a flex row).                                                                                                                                 |
| calendar          | not needed                         | Scheduling uses a native `input type=date`.                                                                                                                                 |
| carousel          | not needed                         |                                                                                                                                                                             |
| chart             | not needed                         | No charts in the in-scope screens.                                                                                                                                          |
| code-block        | candidate for c11 (or 8.3)         | `.code` snippets in settings and agents. It carries Shiki and is restyled with the 8.3 Shiki worker.                                                                        |
| collapsible       | dependency of trace                |                                                                                                                                                                             |
| combobox          | not needed                         | Pickers are native selects.                                                                                                                                                 |
| command           | not needed                         |                                                                                                                                                                             |
| context-menu      | not needed                         |                                                                                                                                                                             |
| direction         | not needed                         | LTR only.                                                                                                                                                                   |
| drawer            | not needed                         | `sheet` covers the mobile panels.                                                                                                                                           |
| hover-card        | not needed                         |                                                                                                                                                                             |
| input-group       | not adopted                        | The prototype's `.input-group` is only a layout (Input + Button in a grid), so screens compose it from kit parts. shadcn's inline-addon group has no prototype counterpart. |
| input-otp         | not needed                         | Join codes and PINs are plain text inputs.                                                                                                                                  |
| kbd               | not needed                         |                                                                                                                                                                             |
| marker            | agentic overlap, operator decision |                                                                                                                                                                             |
| menubar           | not needed                         |                                                                                                                                                                             |
| message           | agentic overlap, operator decision | Possibly superseded by 8.3.                                                                                                                                                 |
| message-scroller  | agentic overlap, operator decision | Possibly superseded by 8.3.                                                                                                                                                 |
| pagination        | not needed                         | The libraries are short lists.                                                                                                                                              |
| popover           | candidate for c11                  | The room's agent and dot popovers, if c11 needs them.                                                                                                                       |
| questionnaire     | agentic overlap, operator decision |                                                                                                                                                                             |
| resizable         | not needed                         |                                                                                                                                                                             |
| scroll-area       | not needed                         | Native overflow is used throughout.                                                                                                                                         |
| select            | not needed                         | Native select is used instead (`native-select`).                                                                                                                            |
| sidebar (7 files) | not adopted                        | The frame is a top app bar. The settings `.sidenav` is a link list that c09 composes from `navigation-menu`/`button`.                                                       |
| skeleton          | not needed                         | The prototype uses text loading states (`role=status`).                                                                                                                     |
| slider            | not needed                         |                                                                                                                                                                             |
| trace             | agentic overlap, operator decision |                                                                                                                                                                             |

Agentic overlap (decision log, 2026-11-09): `message`, `message-scroller`, `bubble`,
`attachment`, `trace`, `questionnaire` and `marker` stay until 8.3 (own AG-UI core)
lands. Then the operator decides which of them it supersedes.

## Static Impeccable audit (2026-11-11)

Context: `impeccable context --target packages/ui` loaded PRODUCT.md. No DESIGN.md
exists, so the visual authority is the incumbent prototype and the tokens. Mode:
Operate, refinement (prometheus-ui-ux route). `impeccable detect --json packages/ui/src
apps/web/src/styles/global.css` returned `[]` (0 findings). Source scan only: under
VLBV, no build, render, screenshot or typecheck ran, so every rendered claim below is
unverified until the c13 boundary.

| #         | Dimension                | Score     | Key finding                                                                                                                                                                                                                         |
| --------- | ------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Accessibility            | 3         | Focus, labels and target sizes are sound. Open: F6 (focus the first error on submit) is form behaviour for c10/c11. The pressed segment and the off switch track in dark still fail SC 1.4.11 (accepted under D-5, revisit at c13). |
| 2         | Performance              | 3         | Motion stays on transform and opacity, except the `progress` width transition and the toast height (small). No will-change added.                                                                                                   |
| 3         | Theming                  | 4         | 0 hex values, 0 `dark:` in the kit. Every colour, radius, space and duration is a token.                                                                                                                                            |
| 4         | Responsive               | 3         | Controls are 44px (36px for `sm`). The 768px rules follow the prototype. Not checked at 375/768/1024/1440.                                                                                                                          |
| 5         | Implementation integrity | 3         | One kit; overlay and field-control classes are shared. Shadcn variant names survive alongside the prototype names (see the mapping above).                                                                                          |
| **Total** |                          | **16/20** | Good                                                                                                                                                                                                                                |

Findings:

- **[P1] Rendered fidelity not proven.** No captures at 375/768/1024/1440 in both
  themes. Run them at the c13 boundary with `tests/fidelity`.
- **[P2] F6 invalid-form submit** (decision log 16.4). `FieldError` is `role=alert`,
  but moving focus to the first error is the form's job. Add it in c10/c11 forms.
  Suggested command: `/impeccable harden`.
- **[P2] F9 raw error codes read aloud.** A copy rule for screens: map codes such as
  `RECORDING_UNAVAILABLE` to cause-then-fix copy (`/impeccable clarify`).
- **[P2] Double focus indicator on uncurated components.** They keep shadcn's 3px ring
  on top of the global ember outline. This resolves itself when each one is curated.
- **[P3] Global reduced-motion kill.** Animations collapse to 0.001ms. This is
  intentional: it is km.css's own rule and PRODUCT.md requires that all motion stops.

## Static polish pass

Done in source:

- `dark:` removed from all moved components.
- `font-heading` (undefined) replaced with `font-display`.
- `ring-1 ring-foreground/10`, `border` and `border-t` removed (Flat 2.0).
- `bg-black/10` scrims replaced with `bg-scrim`.
- Hard-coded durations and easing (`500ms`, `0.35s`, cubic literals) replaced with
  motion tokens.
- Default z-50 layers replaced with the `--z-*` scale.
- Breadcrumb landmark label fixed: "breadcrumb" is now "Breadcrumb".
- Decorative icons marked `aria-hidden`.

Classification: one missing token (Q4), no conceptual mismatches. Everything else is
a local defect, fixed in place.

## Open design questions (design-lead)

1. **A2UI primary-button label contrast** (decision log 16.4). axe flagged it in both
   agentic prototypes. It is a token item for design-lead; no token was changed here.
   The kit's primary button uses `ember-btn` with `on-ember` (contrast record: passes
   in both themes). Confirm whether the A2UI catalog maps to the same pair.
2. **Tooltip role.** The prototype has no tooltip. The kit borrows the toast's
   inverted fg/bg treatment. Confirm it, or define a tooltip role.
3. **Checkbox and radio boundary.** The kit uses the D-5 `ring-input` for unchecked
   boxes, because the native controls in the prototype draw their own border. D-5
   scoped the ring to text inputs, so extending it to these two controls needs
   sign-off, or a fidelity-rubric exception.
4. **Missing tokens.** These values are prototype literals with no token: the 14px
   input inline padding, the 22px switch thumb, 560px dialog / 440px sheet / 440px
   toast widths, and the 46ch empty-state measure. Tokenise them, or accept them as
   component constants.
5. **Light status pips** (green 2.88, amber 2.80) and the pressed segment remain
   below 3:1. Accepted under D-5, revisit at c13.
