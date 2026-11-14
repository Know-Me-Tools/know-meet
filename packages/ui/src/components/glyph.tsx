// TJ-ARCH-MOB-001 compliant
// km.css `.agent-glyph` (cyan-soft tile with the agent's two-letter mono,
// `.is-system` ember-soft for the Concierge) and `.phone-glyph` (green-soft tile
// holding the phone icon at 45%). Width defaults to `clamp(56px, 22%, 84px)`;
// `size="sm"` is the 40px list form (`.agent-glyph-sm`, `.phone-glyph-sm`).
// Decorative by default: the adjacent name identifies the participant.
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "#lib/utils";

const glyphVariants = cva(
  "grid aspect-square flex-none place-items-center rounded-[20px] data-[size=sm]:w-10 data-[size=sm]:rounded-10",
  {
    variants: {
      size: {
        default: "w-[clamp(56px,22%,84px)]",
        sm: "",
      },
    },
    defaultVariants: { size: "default" },
  },
);

type GlyphProps = React.ComponentProps<"span"> & VariantProps<typeof glyphVariants>;

function AgentGlyph({
  className,
  size = "default",
  tone = "agent",
  ...props
}: GlyphProps & { readonly tone?: "agent" | "system" }) {
  return (
    <span
      data-slot="agent-glyph"
      data-size={size}
      data-tone={tone}
      aria-hidden="true"
      className={cn(
        glyphVariants({ size }),
        "bg-cyan-soft font-mono text-glyph font-semibold text-cyan-text uppercase data-[size=sm]:text-13 data-[tone=system]:bg-ember-soft data-[tone=system]:text-ember-text",
        className,
      )}
      {...props}
    />
  );
}

function PhoneGlyph({ className, size = "default", ...props }: GlyphProps) {
  return (
    <span
      data-slot="phone-glyph"
      data-size={size}
      aria-hidden="true"
      className={cn(
        glyphVariants({ size }),
        "bg-green-soft text-green-text [&>svg]:size-[45%]",
        className,
      )}
      {...props}
    />
  );
}

export { AgentGlyph, PhoneGlyph };
