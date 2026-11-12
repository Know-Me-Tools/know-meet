// TJ-ARCH-MOB-001 compliant
// Prototype `busy(btn, label)`: while working, a button shows a spinning refresh
// icon and a progress label (the spin stops under reduced motion).
import { KmIcon } from "@know-meet/ui/components/km-icon";

export function BusyLabel({ label }: { readonly label: string }) {
  return (
    <>
      <KmIcon
        name="refresh"
        className="size-4 animate-spin [animation-duration:var(--anim-spin)] motion-reduce:animate-none"
      />
      <span>{label}</span>
    </>
  );
}
