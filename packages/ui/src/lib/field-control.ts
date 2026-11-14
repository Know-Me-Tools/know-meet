// TJ-ARCH-MOB-001 compliant
// One text-control look shared by Input, Textarea and NativeSelect (DESIGN.md
// "State order", tokens v1.3.0 / D-6): `control` fill with `on-control` text, hover
// `control-hov`, invalid `control-invalid` (the error line below carries the
// message), focus `focus` + `on-focus` with the `focus-placeholder`. No ring.
export const fieldControlClass =
  "w-full min-w-0 rounded-base bg-control px-size-input-pad-x py-size-input-pad-y text-base text-on-control caret-current outline-none transition-colors duration-(--dur-fast) ease-standard placeholder:text-control-placeholder hover:not-disabled:bg-control-hov aria-invalid:bg-control-invalid aria-invalid:text-on-control-invalid aria-invalid:placeholder:text-on-control-invalid focus-visible:bg-focus! focus-visible:text-on-focus! focus-visible:placeholder:text-focus-placeholder! disabled:cursor-not-allowed disabled:opacity-50";
