// TJ-ARCH-MOB-001 compliant
// Shared km.css text roles and link-as-button classes for the public screens.
// Every value is a token utility; no colour or font literals.
import { buttonVariants } from "@know-meet/ui/components/button";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";

/** km.css `.eyebrow`: mono 11px uppercase label in `ember-text`. */
export const eyebrowClass =
  "block font-mono text-11 font-semibold tracking-eyebrow uppercase text-ember-text";

/** km.css `.display`: the hero heading. */
export const displayClass =
  "font-display text-display leading-display font-bold tracking-display";

/** km.css `.lede`. */
export const ledeClass = "text-lg text-muted-foreground max-w-[62ch]";

/** km.css `h1` / `h2` / `h3` sizes (the kit base sets family and weight only). */
export const h1Class = "text-2xl font-bold";
export const h2Class = "text-xl";
export const h3Class = "text-lg";

/**
 * A focusable card or row takes the whole `focus` fill; every piece of content on
 * it drops its own fill and colour so it reads `on-focus` (km.css RV-23 rule).
 */
export const focusContentClass = "focus-visible:**:bg-transparent! focus-visible:**:text-inherit!";

type ButtonVariant = "default" | "secondary" | "ghost";
type ButtonSize = "default" | "sm" | "lg";

/** A router link that looks like a kit Button (km.css `.btn` on an `<a>`). */
export function buttonLinkClass(variant: ButtonVariant = "secondary", size: ButtonSize = "default", extra?: string) {
  return cn(buttonVariants({ variant, size }), focusFillClass, extra);
}

/** km.css `.req`: the visual required marker (the input also carries `aria-required`). */
export const requiredMarkClass = "ml-0.5 text-ember-text";
