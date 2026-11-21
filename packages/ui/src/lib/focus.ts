// TJ-ARCH-MOB-001 compliant
// Flat 2.0 state fills (DESIGN.md "State order": focus wins, then invalid, then
// selected, then hover, then rest). Focus uses `!` so it beats every later variant
// (aria-*, data-*) whatever order Tailwind emits them in. No outline, ring or border.

/** Keyboard focus: the whole control takes `focus` and its content `on-focus`. */
export const focusFillClass = "outline-none focus-visible:bg-focus! focus-visible:text-on-focus!";

/** Focus inside an inverted surface (toast, tooltip on `fg`): swap to the page ground. */
export const invertedFocusFillClass =
  "outline-none focus-visible:bg-background! focus-visible:text-foreground!";

/** Resting control fill whose boundary meets SC 1.4.11 by fill (>= 3:1). */
export const controlFillClass = "bg-control text-on-control hover:not-disabled:bg-control-hov";

/**
 * Neutral clickable button (operator 2026-11-21): ink in light, paper in dark, so a
 * button never reads as disabled. Pair it with `actionFocusFillClass`.
 */
export const actionFillClass = "bg-action text-on-action hover:not-disabled:bg-action-hov";

/**
 * Focus for an action button. `focus` equals the action rest fill, so these buttons focus
 * to the brand cyan instead (>= 3:1 against the rest fill and every control surface).
 */
export const actionFocusFillClass =
  "outline-none focus-visible:bg-action-focus! focus-visible:text-on-action-focus!";

/** Checked, pressed, current or selected. */
export const selectedFillClass = "bg-selected text-on-selected";
