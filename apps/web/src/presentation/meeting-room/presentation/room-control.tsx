// TJ-ARCH-MOB-001 compliant
// meet.html `.ctl`: one room bar control, icon over a label. Labels show under the icon
// from 900px; below that they are visually hidden (still in the name) and controls are
// 48 x 48. Tones (Flat 2.0, every boundary >= 3:1 on the stage by fill): rest `control`,
// off `control-invalid`, active `selected` + `on-selected` (sharing, or the panel this
// control opens is showing; DESIGN.md room bar panel-open state), leave `danger-btn`.
// Focus is the `focus` fill and wins over every tone. An unavailable control keeps its
// tab stop (aria-disabled, opacity 0.5) so its explanation can still be reached.
import { KmIcon, type KmIconName } from "@know-meet/ui/components/km-icon";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import type * as React from "react";

export const ctlClass = cn(
  "relative grid min-h-14 min-w-16 flex-none content-center justify-items-center gap-0.5 rounded-base px-2 py-1.5 transition-colors duration-(--dur-fast) ease-standard",
  "max-bp1024:min-w-[54px] max-bp900:min-h-12 max-bp900:min-w-12 max-bp900:px-3 max-bp900:py-0",
  "data-[tone=rest]:bg-control data-[tone=rest]:text-on-control [@media(hover:hover)]:data-[tone=rest]:hover:bg-control-hov",
  "data-[tone=off]:bg-control-invalid data-[tone=off]:text-on-control-invalid",
  "data-[tone=active]:bg-selected data-[tone=active]:text-on-selected",
  "data-[tone=leave]:bg-danger-btn data-[tone=leave]:text-on-danger [@media(hover:hover)]:data-[tone=leave]:hover:bg-danger-btn-hov",
  "aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
  focusFillClass,
);

export const ctlLabelClass =
  "block text-xs font-semibold whitespace-nowrap max-bp900:absolute max-bp900:size-px max-bp900:overflow-hidden max-bp900:[clip:rect(0_0_0_0)]";

export type CtlTone = "rest" | "off" | "active" | "leave";

export interface CtlProps extends Omit<React.ComponentProps<"button">, "children"> {
  readonly icon: KmIconName;
  readonly label: string;
  readonly tone: CtlTone;
  /** meet.html `.ctl .badge`: a count drawn over the icon (unread messages). */
  readonly badge?: number | undefined;
}

const BADGE_MAX = 9;

export function Ctl({ icon, label, tone, badge, className, ...props }: CtlProps) {
  return (
    <button type="button" data-tone={tone} className={cn(ctlClass, className)} {...props}>
      <KmIcon name={icon} />
      <span className={ctlLabelClass}>{label}</span>
      {badge === undefined || badge === 0 ? null : (
        <span
          aria-hidden="true"
          className="absolute top-1 right-1.5 min-w-[18px] rounded-pill bg-ember-btn px-1.5 text-center text-11 leading-[18px] font-bold text-on-ember"
        >
          {badge > BADGE_MAX ? `${BADGE_MAX}+` : badge}
        </span>
      )}
    </button>
  );
}
