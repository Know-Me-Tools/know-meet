// TJ-ARCH-MOB-001 compliant
// One text-control look shared by Input, Textarea and NativeSelect (km.css `.input`).
// The 1px inset ring is the D-5 Flat 2.0 exception (ring-input, SC 1.4.11); focus
// thickens it to 2px ember, invalid to 2px red, read-only drops to the surface fill.
export const fieldControlClass =
  "w-full min-w-0 rounded-base border-0 bg-card px-3.5 py-s3 text-base text-foreground shadow-[inset_0_0_0_1px_var(--input)] transition-shadow duration-(--dur-fast) ease-standard outline-none placeholder:text-muted-foreground placeholder:opacity-85 focus-visible:shadow-[inset_0_0_0_2px_var(--ring)] focus-visible:outline-none aria-invalid:shadow-[inset_0_0_0_2px_var(--red)] read-only:bg-surface disabled:cursor-not-allowed disabled:opacity-50";
