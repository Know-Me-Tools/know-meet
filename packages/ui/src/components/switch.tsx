// TJ-ARCH-MOB-001 compliant
// DESIGN.md switch (tokens v1.3.0, D-6/D-7): `size-switch-w` x `size-switch-h`
// track, `size-switch-thumb` thumb inset `size-switch-thumb-inset`, travel
// `size-switch-travel`. Off: track `switch-track`, thumb `switch-thumb`; hover
// track `control-hov`; on: track `ember-btn`, thumb `switch-thumb-on`; focus:
// track `focus`, thumb `on-focus` (the thumb position still shows the state).
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "#lib/utils";

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default";
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-pill p-size-switch-thumb-inset outline-none transition-colors duration-(--dur-fast) ease-standard after:absolute after:-inset-2 data-[size=default]:h-size-switch-h data-[size=default]:w-size-switch-w data-[size=sm]:h-5 data-[size=sm]:w-9 data-unchecked:bg-switch-track hover:data-unchecked:not-data-disabled:bg-control-hov data-checked:bg-ember-btn focus-visible:bg-focus! data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-round bg-switch-thumb shadow-(--switch-thumb-shadow) transition-transform duration-(--dur) ease-out group-data-[size=default]/switch:size-size-switch-thumb group-data-[size=sm]/switch:size-3.5 data-checked:bg-switch-thumb-on group-data-[size=default]/switch:data-checked:translate-x-(--spacing-size-switch-travel) group-data-[size=sm]/switch:data-checked:translate-x-4 data-unchecked:translate-x-0 group-focus-visible/switch:bg-on-focus!"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
