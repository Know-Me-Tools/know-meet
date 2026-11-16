// TJ-ARCH-MOB-001 compliant
// prototype meet.html `#lobby .preview-card` (acceptance L1-L5): the mirrored live preview
// (or `#preview-empty` with the initials avatar), the Mic and Camera toggles, the mic level
// meter and, when the browser refused a device, the media error card (`#lb-media-error`).
// Toggles keep the prototype's state labels ("Mic on") with no aria-pressed and expose
// `data-state`. While the permission prompt is open they are aria-disabled (still
// focusable, described by the preview text). Device pickers are not shown: the join use
// case cannot pass a device choice to the meeting (gap reported in wr05).
import type { TrackKind } from "@know-meet/domain";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { useEffect, useRef } from "react";
import { ErrorCard } from "../../guest-meeting/error-card";
import type { Announce } from "../../guest-meeting/live-status";
import { deviceProblemCopy, LOBBY_COPY } from "../../guest-meeting/meeting-copy";
import { initialsOf } from "../../guest-meeting/participant-labels";
import type { DevicePreview } from "./use-device-preview";
import { useMicLevel } from "./use-mic-level";

const PREVIEW_TEXT_ID = "lobby-preview-text";
const DEVICE_ERROR_ID = "lobby-device-error";

/** Rest uses the `control` fill (>= 3:1 on every level); off uses `control-invalid`. */
const toggleClass = cn(
  "inline-flex min-h-size-control-h items-center gap-s2 rounded-base px-s4 font-semibold transition-colors duration-(--dur-fast) ease-standard",
  "data-[state=on]:bg-control data-[state=on]:text-on-control [@media(hover:hover)]:data-[state=on]:hover:bg-control-hov",
  "data-[state=off]:bg-control-invalid data-[state=off]:text-on-control-invalid",
  "aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
  focusFillClass,
);

interface DeviceToggleProps {
  readonly kind: TrackKind;
  readonly on: boolean;
  readonly locked: boolean;
  readonly describedBy: string | undefined;
  readonly onToggle: () => void;
}

function DeviceToggle({ kind, on, locked, describedBy, onToggle }: DeviceToggleProps) {
  const camera = kind === "camera";
  const label = `${camera ? "Camera" : "Mic"} ${on ? "on" : "off"}`;
  const icon = camera ? (on ? "cam" : "cam-off") : on ? "mic" : "mic-off";
  return (
    <button
      type="button"
      data-testid={camera ? "km-lobby-camera-toggle" : "km-lobby-mic-toggle"}
      data-state={on ? "on" : "off"}
      aria-disabled={locked ? true : undefined}
      aria-describedby={describedBy}
      onClick={() => {
        if (!locked) onToggle();
      }}
      className={toggleClass}
    >
      <KmIcon name={icon} />
      <span>{label}</span>
    </button>
  );
}

interface LobbyPreviewProps {
  readonly preview: DevicePreview;
  readonly name: string;
  readonly announce: Announce;
}

export function LobbyPreview({ preview, name, announce }: LobbyPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const { stream, wishes, pending, problems } = preview;
  const showVideo = wishes.camera && (stream?.getVideoTracks().length ?? 0) > 0;
  const showMeter = wishes.microphone && (stream?.getAudioTracks().length ?? 0) > 0;
  useMicLevel(showMeter ? stream : null, meterRef, fillRef);

  useEffect(() => {
    const video = videoRef.current;
    if (video === null) return;
    video.srcObject = showVideo ? stream : null;
  }, [stream, showVideo]);

  const errorCopy = deviceProblemCopy(problems.camera, problems.microphone);
  const toggle = (kind: TrackKind) => {
    const next = !wishes[kind];
    const noun = kind === "camera" ? "Camera" : "Microphone";
    announce(`${noun} ${next ? "on" : "off"}`);
    preview.toggle(kind);
  };
  const describedBy = pending ? PREVIEW_TEXT_ID : errorCopy === null ? undefined : DEVICE_ERROR_ID;

  return (
    <section aria-label="Camera and microphone check" className="grid min-w-0 gap-s4">
      <div className="relative grid aspect-video place-items-center overflow-hidden rounded-lg bg-tile">
        <video
          ref={videoRef}
          data-testid="km-lobby-camera-preview"
          aria-label="Your camera preview"
          autoPlay
          muted
          playsInline
          hidden={!showVideo}
          className="block size-full -scale-x-100 object-cover"
        />
        {showVideo ? null : (
          <div className="grid justify-items-center gap-s3 p-s5 text-center">
            <span
              aria-hidden="true"
              className="grid size-24 place-items-center rounded-round bg-card font-display text-34 leading-none font-semibold text-foreground uppercase"
            >
              {initialsOf(name)}
            </span>
            <p id={PREVIEW_TEXT_ID} className="max-w-[32ch] text-sm text-muted-foreground">
              {pending ? LOBBY_COPY.previewPending : LOBBY_COPY.previewOff}
            </p>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-s2">
        <DeviceToggle
          kind="microphone"
          on={wishes.microphone}
          locked={pending}
          describedBy={describedBy}
          onToggle={() => toggle("microphone")}
        />
        <DeviceToggle
          kind="camera"
          on={wishes.camera}
          locked={pending}
          describedBy={describedBy}
          onToggle={() => toggle("camera")}
        />
      </div>
      <div hidden={!showMeter} className="flex min-h-size-target items-center gap-s3">
        <KmIcon name="mic" className="text-muted-foreground" />
        <div
          ref={meterRef}
          role="meter"
          aria-label="Microphone level"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          className="h-2 flex-1 overflow-hidden rounded-pill bg-muted"
        >
          <div
            ref={fillRef}
            style={{ transform: "scaleX(0)" }}
            className="h-full w-full origin-left bg-green"
          />
        </div>
      </div>
      {errorCopy === null ? null : (
        <ErrorCard
          copy={errorCopy}
          headingId={DEVICE_ERROR_ID}
          testId="km-state-permission-denied"
        />
      )}
    </section>
  );
}
