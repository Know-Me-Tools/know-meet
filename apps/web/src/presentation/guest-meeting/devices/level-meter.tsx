// TJ-ARCH-MOB-001 compliant
// The microphone level meter shared by the lobby preview card and the room's "Audio and
// video" pane (device-settings shape, DS-2, DS-11): `role="meter"` named "Microphone
// level", 0 to 100 in aria-valuenow, 8px pill track on `muted` with the `meter-fill` value
// (tokens v1.6.0; never `green`, which is 2.28:1 in light). The fill eases over
// `dur-meter`, linear, and not at all under reduced motion. Hidden while the microphone is
// off, so it never reports a level for a device that is not listening.
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { useRef } from "react";
import { useMicLevel } from "./use-mic-level";

interface LevelMeterProps {
  /** The stream whose first audio track is measured; null shows an empty meter. */
  readonly stream: MediaStream | null;
  readonly hidden: boolean;
  readonly testId?: string;
}

export function LevelMeter({ stream, hidden, testId }: LevelMeterProps) {
  const meterRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  useMicLevel(hidden ? null : stream, meterRef, fillRef);
  return (
    <div hidden={hidden} className="flex min-h-size-target items-center gap-s3">
      <KmIcon name="mic" className="text-muted-foreground" />
      {/* biome-ignore lint/a11y/useSemanticElements: a native <meter> cannot take the token-styled fill bar; role="meter" with aria-value* gives the same semantics. */}
      <div
        ref={meterRef}
        role="meter"
        aria-label="Microphone level"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        data-testid={testId}
        className="h-2 flex-1 overflow-hidden rounded-pill bg-muted"
      >
        <div
          ref={fillRef}
          style={{ transform: "scaleX(0)" }}
          className="h-full w-full origin-left bg-meter-fill transition-transform duration-(--dur-meter) ease-linear motion-reduce:transition-none"
        />
      </div>
    </div>
  );
}
