// TJ-ARCH-MOB-001 compliant
// km.css `.code`: a monospace block (13px, line-height 1.6, `pre`, own horizontal
// scroll), radius-base, `surface` fill — or `bg` when it sits inside a card or
// panel (`tone="inset"`). It scrolls, so it is a named keyboard-scrollable region
// (`tabIndex=0` + `aria-label`); focus is the whole-region `focus` fill with
// `on-focus` text (RV-23), never an outline. Plain text only, no highlighting.
import type * as React from "react";
import { cn } from "#lib/utils";

interface CodePanelProps extends Omit<React.ComponentProps<"pre">, "aria-label"> {
  /** Names the scroll region for screen readers. */
  readonly label: string;
  readonly tone?: "surface" | "inset";
}

function CodePanel({ label, tone = "surface", className, ...props }: CodePanelProps) {
  return (
    <pre
      data-slot="code-panel"
      data-tone={tone}
      tabIndex={0}
      aria-label={label}
      className={cn(
        "m-0 block overflow-x-auto rounded-base bg-surface px-s4 py-s3 font-mono text-13 leading-[1.6] whitespace-pre text-foreground data-[tone=inset]:bg-background",
        "outline-none transition-colors duration-(--dur-fast) focus-visible:bg-focus! focus-visible:text-on-focus!",
        className,
      )}
      {...props}
    />
  );
}

export { CodePanel };
