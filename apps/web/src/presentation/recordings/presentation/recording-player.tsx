// TJ-ARCH-MOB-001 compliant
// recordings.html `buildPlayer`: the player card (stage stub, seek slider with
// chapter ticks, play/pause, time, speed, captions toggle, chapter chips). It is a
// static stand-in: nothing streams; the simulated clock comes from `usePlayback`.
import { Badge } from "@know-meet/ui/components/badge";
import { Button } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { NativeSelect, NativeSelectOption } from "@know-meet/ui/components/native-select";
import { RangeInput } from "@know-meet/ui/components/range-input";
import { cn } from "@know-meet/ui/lib/utils";
import { formatDuration } from "../../workspace/application/format";
import type { Recording, Workspace } from "../../workspace/domain/workspace";
import { type Chapter, chapterIndexAt, type FlatSegment } from "../application/recordings-model";
import { PlayerStage } from "./player-stage";
import type { Playback } from "./use-playback";

const SPEEDS = ["0.75", "1", "1.25", "1.5", "2"] as const;

interface RecordingPlayerProps {
  readonly workspace: Workspace;
  readonly recording: Recording;
  readonly chapters: readonly Chapter[];
  readonly current: FlatSegment | null;
  readonly playback: Playback;
}

function clock(seconds: number): string {
  return formatDuration(seconds * 1000);
}

export function RecordingPlayer({
  workspace,
  recording,
  chapters,
  current,
  playback,
}: RecordingPlayerProps) {
  const { t, total } = playback;
  const currentChapter = chapterIndexAt(chapters, t);
  return (
    <section
      aria-label="Recording player"
      className="overflow-hidden rounded-lg bg-surface shadow-(--shadow-card)"
    >
      <PlayerStage
        workspace={workspace}
        recording={recording}
        current={current}
        captions={playback.captions}
        playing={playback.playing}
        onPlay={playback.toggle}
      />
      <div className="grid gap-s2 px-s4 pt-s3 pb-s4">
        <div className="relative pt-3">
          <div aria-hidden="true" className="absolute inset-x-2 top-0 h-2.5">
            {chapters.map((chapter, index) => (
              <span
                key={chapter.title}
                title={`${clock(chapter.t)} ${chapter.title}`}
                className={cn(
                  "absolute top-0 h-2.5 w-1 -translate-x-1/2 rounded-2",
                  index === currentChapter ? "bg-ember" : "bg-fg-sub",
                )}
                style={{ left: `${(chapter.t / total) * 100}%` }}
              />
            ))}
          </div>
          <RangeInput
            aria-label="Seek"
            aria-valuetext={`${clock(t)} of ${clock(total)}`}
            min={0}
            max={total}
            step={1}
            value={Math.floor(t)}
            onChange={(event) => playback.seek(Number(event.target.value))}
            className="min-h-7 w-full"
          />
        </div>
        <div className="flex flex-wrap items-center gap-s2">
          <Button
            variant="ghost"
            size="icon"
            aria-label={playback.playing ? "Pause" : "Play"}
            onClick={playback.toggle}
          >
            <KmIcon
              name={playback.playing ? "pause" : "play"}
              className={playback.playing ? undefined : "fill-current"}
            />
          </Button>
          <span className="font-mono text-13 whitespace-nowrap text-muted-foreground tabular-nums">
            {clock(t)} / {clock(total)}
          </span>
          <span className="flex-auto" />
          <label htmlFor="pl-speed" className="sr-only">
            Playback speed
          </label>
          <NativeSelect
            id="pl-speed"
            size="sm"
            className="w-auto"
            value={String(playback.speed)}
            onChange={(event) => playback.setSpeed(Number(event.target.value))}
          >
            {SPEEDS.map((speed) => (
              <NativeSelectOption key={speed} value={speed}>
                {speed}×
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Captions"
            aria-pressed={playback.captions}
            title="Captions"
            onClick={() => playback.setCaptions(!playback.captions)}
          >
            <KmIcon name="cc" />
          </Button>
        </div>
        <fieldset aria-label="Chapters" className="m-0 min-w-0 p-0 flex flex-wrap gap-1.5">
          {chapters.map((chapter, index) => (
            <Badge
              key={chapter.title}
              render={<button type="button" />}
              variant={index === currentChapter ? "ember" : "default"}
              aria-current={index === currentChapter ? "true" : "false"}
              aria-label={`Jump to ${clock(chapter.t)}, ${chapter.title}`}
              onClick={() => playback.seek(chapter.t)}
              className="min-h-8"
            >
              <span className="font-mono text-11">{clock(chapter.t)}</span>
              <span>{chapter.title}</span>
            </Badge>
          ))}
        </fieldset>
      </div>
    </section>
  );
}
