// TJ-ARCH-MOB-001 compliant
// Busy button content (acceptance H2, L6): spinner plus the busy text, so the accessible
// name becomes "Starting…" / "Joining…". The spinner is decorative (its own "Loading"
// label would otherwise join the name). Under reduced motion the kit base layer stops it.
import { KmIcon, type KmIconName } from "@know-meet/ui/components/km-icon";
import { Spinner } from "@know-meet/ui/components/spinner";

interface BusyLabelProps {
  readonly busy: boolean;
  readonly icon?: KmIconName;
  readonly label: string;
  readonly busyLabel: string;
}

export function BusyLabel({ busy, icon, label, busyLabel }: BusyLabelProps) {
  if (busy) {
    return (
      <>
        <Spinner aria-hidden="true" role="presentation" className="size-5" />
        <span>{busyLabel}</span>
      </>
    );
  }
  return (
    <>
      {icon === undefined ? null : <KmIcon name={icon} />}
      <span>{label}</span>
    </>
  );
}
