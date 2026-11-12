// TJ-ARCH-MOB-001 compliant
// DESIGN.md "Speaking on a room tile" (D-6, replaces the speaking rings): a
// `size-speak-badge` (24px) solid badge, radius-8, holding three `on-speak` voice
// bars (2px wide; 8, 14 and 10px tall, 2px apart, as km.css `--speak-bars`).
// `speak-person` for people, `speak-agent` for dots and agents, `speak-phone` for
// dial-in. Theme-invariant colours. Decorative: pass `aria-label` via a wrapper or
// sr-only text when speaking state must be announced.
import type * as React from "react";
import { cn } from "#lib/utils";

type SpeakTone = "person" | "agent" | "phone";

function SpeakBadge({
  className,
  tone = "person",
  ...props
}: React.ComponentProps<"span"> & { readonly tone?: SpeakTone }) {
  return (
    <span
      data-slot="speak-badge"
      data-tone={tone}
      aria-hidden="true"
      className={cn(
        "inline-flex size-size-speak-badge flex-none items-center justify-center gap-0.5 rounded-8 bg-speak-person data-[tone=agent]:bg-speak-agent data-[tone=phone]:bg-speak-phone",
        "*:w-0.5 *:rounded-pill *:bg-on-speak",
        className,
      )}
      {...props}
    >
      <span className="h-2" />
      <span className="h-3.5" />
      <span className="h-2.5" />
    </span>
  );
}

export { SpeakBadge };
