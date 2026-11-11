// TJ-ARCH-MOB-001 compliant
// Tooltip = toast style (operator 2026-11-11, DESIGN.md): `fg` fill with `bg`
// text, 14px medium, radius 12, `size-tooltip-pad-y` x `size-tooltip-pad-x`
// padding, max width `size-tooltip-max-w` (never wider than the viewport minus
// 32px), float shadow, no arrow. Opens after 500ms hover or at once on focus,
// closes on Escape (Base UI, SC 1.4.13). Never the only copy of information.
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "#lib/utils";

/** DESIGN.md: tooltips appear after 500ms of hover. */
const TOOLTIP_HOVER_DELAY_MS = 500;

function TooltipProvider({ delay = TOOLTIP_HOVER_DELAY_MS, ...props }: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delay} {...props} />;
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 8,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-(--z-toast)"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "inline-flex w-fit max-w-[min(var(--spacing-size-tooltip-max-w),calc(100vw-32px))] origin-(--transform-origin) items-center gap-1.5 rounded-base bg-foreground px-size-tooltip-pad-x py-size-tooltip-pad-y text-sm leading-140 font-medium text-background shadow-(--shadow-float) duration-(--dur-fast) ease-out has-data-[slot=kbd]:pr-1.5 data-open:animate-in data-open:fade-in-0 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 data-closed:animate-out data-closed:fade-out-0",
            className,
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
