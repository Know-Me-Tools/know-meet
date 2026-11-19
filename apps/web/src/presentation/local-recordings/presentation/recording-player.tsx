// TJ-ARCH-MOB-001 compliant
// The detail player (shape recordings-library.md §5, §6, §8; RL-5, RL-6, RL-10-RL-12):
// the signed-in player grammar (`media-bg` stage, big `ember-btn` play, control row on
// `surface` with ghost 44px buttons, kit range scrubber, speed select) on a real
// `<video>` whose source is the `blob:` URL of the local file. It never autoplays.
// Focus order: play, scrubber, mute, speed, full screen (the big stage button is a
// pointer shortcut, out of the tab order and hidden from assistive technology).
// Keys while focus is in the region: Space or K play/pause, Left/Right 5 s, Home/End,
// M mute, F full screen; on the scrubber arrows move 5 s and PageUp/PageDown 30 s.
// The element's own error event shows the playback error on the stage.
// Scenario contract: `km-recording-play` (the control-row play button) and
// `km-recording-player` (the `<video>`).
import { Button } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { NativeSelect, NativeSelectOption } from "@know-meet/ui/components/native-select";
import { RangeInput } from "@know-meet/ui/components/range-input";
import type * as React from "react";
import { useId } from "react";
import { formatDuration } from "../../workspace/application/format";
import { useVideoPlayer, type VideoPlayer } from "./use-video-player";

const SPEEDS = ["0.75", "1", "1.25", "1.5", "2"] as const;
const STEP_S = 5;
const PAGE_S = 30;

function clock(seconds: number): string {
  return formatDuration(seconds * 1000);
}

function isTag(target: EventTarget, tag: string): boolean {
  return target instanceof HTMLElement && target.tagName === tag;
}

/** The region's key map; null when the key is not the player's. */
function keyAction(event: React.KeyboardEvent, player: VideoPlayer): (() => void) | null {
  const { target } = event;
  if (isTag(target, "SELECT")) return null;
  const onScrubber = isTag(target, "INPUT");
  const onButton = isTag(target, "BUTTON");
  switch (event.key) {
    case " ":
      return onButton ? null : player.toggle;
    case "k":
    case "K":
      return player.toggle;
    case "m":
    case "M":
      return player.toggleMuted;
    case "f":
    case "F":
      return player.fullscreenAvailable ? player.toggleFullscreen : null;
    case "ArrowLeft":
      return () => player.seekBy(-STEP_S);
    case "ArrowRight":
      return () => player.seekBy(STEP_S);
    case "ArrowDown":
      return onScrubber ? () => player.seekBy(-STEP_S) : null;
    case "ArrowUp":
      return onScrubber ? () => player.seekBy(STEP_S) : null;
    case "PageDown":
      return onScrubber ? () => player.seekBy(-PAGE_S) : null;
    case "PageUp":
      return onScrubber ? () => player.seekBy(PAGE_S) : null;
    case "Home":
      return () => player.seek(0);
    case "End":
      return player.duration === null ? null : () => player.seek(player.duration ?? 0);
    default:
      return null;
  }
}

function Stage({ url, player }: { readonly url: string; readonly player: VideoPlayer }) {
  return (
    <div className="relative grid aspect-video place-items-center bg-media-bg">
      <video
        ref={player.videoRef}
        src={url}
        preload="metadata"
        playsInline
        data-testid="km-recording-player"
        className="size-full object-contain"
        onClick={player.toggle}
        {...player.videoEvents}
      />
      {player.failed ? (
        <div className="absolute inset-0 grid place-items-center bg-media-bg p-s5">
          <p className="flex max-w-[44ch] items-start gap-s2 text-sm text-foreground">
            <KmIcon name="alert" className="mt-px flex-none text-red-text" />
            <span>
              This browser can't play this file. Download it and open it in a video player.
            </span>
          </p>
        </div>
      ) : player.playing ? null : (
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          onClick={player.toggle}
          className="absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-round bg-ember-btn text-on-ember outline-none"
        >
          <KmIcon name="play" className="size-7 fill-current" />
        </button>
      )}
    </div>
  );
}

function ControlRow({ player }: { readonly player: VideoPlayer }) {
  const speedId = useId();
  const { duration, time } = player;
  const disabled = player.failed;
  return (
    <div className="grid gap-s2 px-s4 pt-s3 pb-s4">
      <div className="flex flex-wrap items-center gap-x-s2 gap-y-s1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={player.playing ? "Pause" : "Play"}
          data-testid="km-recording-play"
          disabled={disabled}
          focusableWhenDisabled
          onClick={player.toggle}
        >
          <KmIcon
            name={player.playing ? "pause" : "play"}
            className={player.playing ? undefined : "fill-current"}
          />
        </Button>
        <span className="font-mono text-13 whitespace-nowrap text-muted-foreground tabular-nums">
          {clock(time)}
          {duration === null ? "" : ` / ${clock(duration)}`}
        </span>
        <RangeInput
          aria-label="Seek"
          aria-valuetext={duration === null ? clock(time) : `${clock(time)} of ${clock(duration)}`}
          min={0}
          max={duration ?? 0}
          step="any"
          value={duration === null ? 0 : Math.min(time, duration)}
          disabled={disabled || duration === null}
          onChange={(event) => player.seek(Number(event.target.value))}
          className="min-h-7 min-w-[160px] flex-1 max-bp768:basis-full"
        />
        <span className="flex flex-auto items-center justify-end gap-s2">
          <Button
            variant="ghost"
            size="icon"
            aria-label={player.muted ? "Unmute" : "Mute"}
            disabled={disabled}
            focusableWhenDisabled
            onClick={player.toggleMuted}
          >
            <KmIcon name={player.muted ? "speaker-off" : "speaker"} />
          </Button>
          <label htmlFor={speedId} className="sr-only">
            Playback speed
          </label>
          <NativeSelect
            id={speedId}
            className="w-auto"
            value={String(player.speed)}
            disabled={disabled}
            onChange={(event) => player.setSpeed(Number(event.target.value))}
          >
            {SPEEDS.map((speed) => (
              <NativeSelectOption key={speed} value={speed}>
                {speed}×
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {player.fullscreenAvailable ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label={player.fullscreen ? "Exit full screen" : "Full screen"}
              onClick={player.toggleFullscreen}
            >
              <KmIcon name={player.fullscreen ? "x" : "screen"} />
            </Button>
          ) : null}
        </span>
      </div>
    </div>
  );
}

interface RecordingPlayerProps {
  /** `blob:` object URL of the local file. */
  readonly url: string;
  /** Recorded length in seconds, used when the file does not report its own. */
  readonly recordedSeconds: number | null;
}

export function RecordingPlayer({ url, recordedSeconds }: RecordingPlayerProps) {
  const player = useVideoPlayer(recordedSeconds);
  return (
    <section
      ref={player.regionRef}
      aria-label="Recording player"
      onKeyDown={(event) => {
        const action = keyAction(event, player);
        if (action === null) return;
        event.preventDefault();
        action();
      }}
      className="overflow-hidden rounded-lg bg-surface"
    >
      <Stage url={url} player={player} />
      <ControlRow player={player} />
    </section>
  );
}
