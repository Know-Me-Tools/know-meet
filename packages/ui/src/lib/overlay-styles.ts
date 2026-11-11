// TJ-ARCH-MOB-001 compliant
// Shared overlay styling for Dialog, AlertDialog and Sheet (km.css `dialog`,
// `.dlg-*`, `.sheet-*`): scrim token, bg-2 surface, float shadow, token motion.

/** km.css `dialog::backdrop` / `.sheet-scrim`. */
export const scrimClass =
  "fixed inset-0 isolate z-(--z-scrim) bg-scrim duration-(--dur) ease-out data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 data-closed:duration-(--dur-exit) data-closed:ease-in";

/** km.css `dialog` + `dlg-in` (translateY 8px, scale 0.98). */
export const centredPopupClass =
  "fixed top-1/2 left-1/2 z-(--z-sheet) grid max-h-[calc(100dvh-48px)] w-[min(560px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_minmax(0,1fr)_auto] rounded-lg bg-popover text-popover-foreground shadow-(--shadow-float) outline-none duration-(--dur) ease-out data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.98] data-open:slide-in-from-bottom-2 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.98] data-closed:duration-(--dur-exit) data-closed:ease-in";

/** `.dlg-head` / `.sheet-head`; right padding leaves room for the 44px close button. */
export const overlayHeaderClass = "grid content-start gap-1 px-s5 pt-s5 pb-s3 pr-16";

/** `.dlg-head h2` / `.sheet-head h2`. */
export const overlayTitleClass =
  "font-display text-xl leading-heading font-semibold tracking-heading text-foreground";

/** `.dlg-head p` / `.sheet-head p`. */
export const overlayDescriptionClass =
  "text-sm text-muted-foreground [&_a]:text-ember-text [&_a]:underline [&_a]:underline-offset-[3px]";

/** `.dlg-foot`; buttons share the row on narrow screens. */
export const overlayFooterClass =
  "flex flex-wrap justify-end gap-s2 px-s5 pt-s3 pb-s5 max-bp768:*:flex-auto";

/** Close control position (top-right of the header band). */
export const overlayCloseClass = "absolute top-s3 right-s3";
