// TJ-ARCH-MOB-001 compliant
// km.css `.switch` with the D-5 colours: off track `switch-track`, thumb
// `switch-thumb`; on track ember, thumb `switch-thumb-on` (dark text colour in
// dark theme so the thumb clears 3:1 on ember). 48×28 track, 22px thumb.
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
        "peer group/switch relative inline-flex shrink-0 items-center rounded-pill p-0.75 transition-colors duration-(--dur-fast) ease-standard after:absolute after:-inset-x-2 after:-inset-y-2 data-[size=default]:h-7 data-[size=default]:w-12 data-[size=sm]:h-5 data-[size=sm]:w-9 data-checked:bg-primary data-unchecked:bg-switch-track aria-invalid:shadow-[0_0_0_2px_var(--red)] data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-round bg-switch-thumb shadow-(--switch-thumb-shadow) transition-transform duration-(--dur) ease-out group-data-[size=default]/switch:size-5.5 group-data-[size=sm]/switch:size-3.5 data-checked:bg-switch-thumb-on group-data-[size=default]/switch:data-checked:translate-x-5 group-data-[size=sm]/switch:data-checked:translate-x-4 data-unchecked:translate-x-0"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
