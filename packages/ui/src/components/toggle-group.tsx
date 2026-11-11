// TJ-ARCH-MOB-001 compliant
// DESIGN.md segmented control (tokens v1.3.0, D-6): a `control` track, 4px
// padded, holding Toggle segments (default variant: transparent, `on-control`
// text, pressed `selected` with a leading check). The outline variant is a bare
// row of icon toggles.
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { TogglePressedCheck, toggleVariants } from "#components/toggle";
import { focusFillClass } from "#lib/focus";
import { cn } from "#lib/utils";

type ToggleGroupContextValue = VariantProps<typeof toggleVariants> & {
  spacing?: number;
  orientation?: "horizontal" | "vertical";
};

const ToggleGroupContext = React.createContext<ToggleGroupContextValue>({
  size: "default",
  variant: "default",
  spacing: 1,
  orientation: "horizontal",
});

function ToggleGroup({
  className,
  variant = "default",
  size = "default",
  spacing = 1,
  orientation = "horizontal",
  children,
  ...props
}: ToggleGroupPrimitive.Props & ToggleGroupContextValue) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      data-orientation={orientation}
      style={{ "--gap": spacing } as React.CSSProperties}
      className={cn(
        "group/toggle-group flex w-fit flex-row flex-wrap items-center gap-[--spacing(var(--gap))] rounded-base data-vertical:flex-col data-vertical:items-stretch data-[variant=default]:bg-control data-[variant=default]:p-1",
        className,
      )}
      {...props}
    >
      <ToggleGroupContext value={{ variant, size, spacing, orientation }}>
        {children}
      </ToggleGroupContext>
    </ToggleGroupPrimitive>
  );
}

function ToggleGroupItem({
  className,
  children,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  const context = React.use(ToggleGroupContext);
  const resolvedVariant = context.variant ?? variant;
  const resolvedSize = context.size ?? size;

  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      data-variant={resolvedVariant}
      data-size={resolvedSize}
      data-spacing={context.spacing}
      className={cn(
        "shrink-0 focus-visible:z-10",
        toggleVariants({ variant: resolvedVariant, size: resolvedSize }),
        focusFillClass,
        className,
      )}
      {...props}
    >
      {resolvedVariant === "default" ? <TogglePressedCheck /> : null}
      {children}
    </TogglePrimitive>
  );
}

export { ToggleGroup, ToggleGroupItem };
