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

/** Checked, pressed, current or selected. */
export const selectedFillClass = "bg-selected text-on-selected";
