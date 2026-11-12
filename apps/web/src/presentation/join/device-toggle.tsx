// TJ-ARCH-MOB-001 compliant
// join.html `deviceToggle`: a `.device` row (state icon, label with the "On/Off
// when you join" line, then the kit Switch). The label is bound to the switch, so
// the whole copy is a click target and names it; the line under it repeats the
// state in words (never colour or thumb position alone).
import { KmIcon, type KmIconName } from "@know-meet/ui/components/km-icon";
import { Switch } from "@know-meet/ui/components/switch";

interface DeviceToggleProps {
  readonly id: string;
  readonly label: string;
  readonly onIcon: KmIconName;
  readonly offIcon: KmIconName;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}

export function DeviceToggle({ id, label, onIcon, offIcon, checked, onChange }: DeviceToggleProps) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-s3 rounded-base bg-card px-s4 py-s3">
      <KmIcon name={checked ? onIcon : offIcon} />
      <label htmlFor={id} className="grid cursor-pointer">
        <strong className="block">{label}</strong>
        <small className="block text-xs text-muted-foreground">
          {checked ? "On when you join" : "Off when you join"}
        </small>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
