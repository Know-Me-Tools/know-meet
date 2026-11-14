// TJ-ARCH-MOB-001 compliant
// km.css `.orb`: a dot's sphere (radial ember fill, `orb--cyan` for a colleague's
// dot), breathing at `--dot-breathe` (styles/presence.css). Decorative: the name
// next to it identifies the dot. Width defaults to km.css `clamp(64px, 32%, 120px)`;
// callers size it with `w-*` (`.orb-sm` = w-10, `.orb-xs` = w-7).
import type * as React from "react";
import { cn } from "#lib/utils";

type OrbTone = "ember" | "cyan";

function Orb({
  className,
  tone = "ember",
  ...props
}: React.ComponentProps<"span"> & { readonly tone?: OrbTone }) {
  return (
    <span
      data-slot="orb"
      data-tone={tone}
      aria-hidden="true"
      className={cn(
        "relative block aspect-square w-[clamp(64px,32%,120px)] flex-none rounded-round bg-orb [--orb:var(--ember)] data-[tone=cyan]:[--orb:var(--cyan)]",
        "animate-orb-breathe motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

export { Orb };
