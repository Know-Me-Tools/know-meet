// TJ-ARCH-MOB-001 compliant
// The "Audio" section of the room's "Audio and video" pane (wc05 task 5.2; WC-5, WC-6,
// WC-13): Microphone picker, its level meter, then Speaker. Where the browser can choose
// an output (support.speakerSelection) the Speaker picker and "Play test sound" show;
// otherwise a neutral note under the Speaker heading explains that the system output is
// used, in a role="status" element so it is announced once when the pane opens (DS-5,
// DS-6). A microphone the browser blocked shows the reason instead of the picker.
// Scenario contract: km-settings-mic-select, km-settings-speaker-select,
// km-speaker-unsupported.
import type { ConferencingSupport, DeviceId } from "@know-meet/domain";
import { Button } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { DEVICE_COPY, deviceBlocked } from "../../../guest-meeting/devices/device-copy";
import { DeviceField } from "../../../guest-meeting/devices/device-field";
import { LevelMeter } from "../../../guest-meeting/devices/level-meter";
import type { RoomDevice } from "./use-room-device";
import { useTestSound } from "./use-test-sound";

export const sectionHeadingClass = "font-display text-base font-semibold";

interface AudioSectionProps {
  readonly microphone: RoomDevice;
  readonly speaker: RoomDevice;
  /** The speaker in use, for the test sound; null plays through the default output. */
  readonly speakerId: DeviceId | null;
  readonly support: ConferencingSupport;
  readonly micBlocked: boolean;
  /** The pane's own capture of the microphone in use; null while closed or muted. */
  readonly micStream: MediaStream | null;
  readonly micOn: boolean;
}

/** DS-10: 44px on touch, the 36px `sm` size only under a fine pointer. */
const testSoundClass = "w-fit [@media(pointer:coarse)]:min-h-size-target";

export function AudioSection({
  microphone,
  speaker,
  speakerId,
  support,
  micBlocked,
  micStream,
  micOn,
}: AudioSectionProps) {
  const sound = useTestSound(speakerId);
  const speakerSupported = support.speakerSelection === "supported";
  return (
    <section aria-labelledby="settings-audio-heading" className="grid gap-s3">
      <h3 id="settings-audio-heading" className={sectionHeadingClass}>
        {DEVICE_COPY.audioHeading}
      </h3>
      {micBlocked ? (
        <p className="text-sm text-foreground">{deviceBlocked("microphone")}</p>
      ) : (
        <>
          <DeviceField
            id="settings-microphone"
            testId="km-settings-mic-select"
            label="Microphone"
            {...microphone}
          />
          <LevelMeter stream={micStream} hidden={!micOn} />
        </>
      )}
      {speakerSupported ? (
        <>
          <DeviceField
            id="settings-speaker"
            testId="km-settings-speaker-select"
            label="Speaker"
            {...speaker}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-disabled={sound.playing ? true : undefined}
            onClick={() => {
              if (!sound.playing) sound.play();
            }}
            className={testSoundClass}
          >
            <KmIcon name="speaker" />
            {sound.playing ? DEVICE_COPY.testSoundPlaying : DEVICE_COPY.testSound}
          </Button>
        </>
      ) : (
        <div className="grid gap-1.5">
          <h4 className="text-sm font-semibold text-foreground">Speaker</h4>
          <div
            role="status"
            data-testid="km-speaker-unsupported"
            className="flex items-start gap-s2 rounded-base bg-surface p-s3 text-sm text-foreground"
          >
            <KmIcon name="info" className="mt-0.5 size-4 flex-none text-muted-foreground" />
            <span>{DEVICE_COPY.speakerUnsupported}</span>
          </div>
        </div>
      )}
    </section>
  );
}
