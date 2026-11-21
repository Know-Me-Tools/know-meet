// TJ-ARCH-MOB-001 compliant
// Person tiles of the guest room (acceptance R1-R5; prototype meet.html `humanTile`,
// live-room.js `makePersonTile`). Media is bound through the RealtimeRoom port
// (`attachMedia`), never by touching tracks here. Each remote tile holds a muted, inline
// <video> for the camera and a separate <audio> for the microphone (release UI contract);
// the local tile shows the local camera mirrored and never plays the local microphone.
// With no video the tile shows the initials avatar on `tile`. Muted is a badge (red-soft on
// an avatar, the opaque danger fill over video, O-6) and part of the tile name. Speaking is
// not shown: the port carries no speaking signal (gap reported in wr05). The local tile
// reports what its published camera carries in `data-video-processor` (none,
// background-blur, virtual-background; scenario contract WC-4).
import type { RealtimeRoom } from "@know-meet/application";
import type { LocalParticipant, Participant, RemoteParticipant } from "@know-meet/domain";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { cn } from "@know-meet/ui/lib/utils";
import type { ReactNode } from "react";
import { initialsOf, showsVideo, tileName } from "../../guest-meeting/participant-labels";
import type { VideoProcessorName } from "./background/background-options";
import { useMediaBinding } from "./use-media-binding";

const tileClass =
  "relative isolate aspect-[16/10] min-h-[180px] overflow-hidden rounded-tile bg-tile text-foreground max-bp481:aspect-[4/3] max-bp481:min-h-[160px]";

function MutedBadge({
  overVideo,
  testId,
}: {
  readonly overVideo: boolean;
  readonly testId?: string | undefined;
}) {
  return (
    <span
      data-testid={testId}
      aria-hidden="true"
      className={cn(
        "inline-grid size-7 flex-none place-items-center rounded-8",
        overVideo ? "bg-danger-btn text-on-danger" : "bg-red-soft text-foreground",
      )}
    >
      <KmIcon name="mic-off" className="size-4" />
    </span>
  );
}

function TileBody({
  participant,
  video,
  muteTestId,
}: {
  readonly participant: Participant;
  readonly video: ReactNode;
  readonly muteTestId?: string | undefined;
}) {
  const hasVideo = showsVideo(participant);
  const label =
    participant.kind === "local" ? `${participant.displayName} (you)` : participant.displayName;
  return (
    <>
      {video}
      {hasVideo ? null : (
        <div className="absolute inset-0 grid place-items-center bg-tile">
          <span
            aria-hidden="true"
            className="inline-grid aspect-square w-[clamp(64px,30%,104px)] place-items-center rounded-round bg-card font-display text-tile-avatar leading-none font-semibold text-foreground uppercase"
          >
            {initialsOf(participant.displayName)}
          </span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex min-h-11 items-center gap-s2 px-s3 pt-s2 pb-s3">
        <span
          aria-hidden="true"
          className="block min-w-0 truncate rounded-6 bg-media-tag-bg px-s2 py-0.5 text-sm font-semibold text-on-media"
        >
          {label}
        </span>
        {participant.microphone.muted ? (
          <MutedBadge overVideo={hasVideo} testId={muteTestId} />
        ) : null}
      </div>
    </>
  );
}

export function LocalTile({
  room,
  local,
  processor,
}: {
  readonly room: RealtimeRoom;
  readonly local: LocalParticipant;
  readonly processor: VideoProcessorName;
}) {
  const videoRef = useMediaBinding<HTMLVideoElement>(room, local.identity, "camera");
  return (
    // biome-ignore lint/a11y/useSemanticElements: a video tile is not a form group, so <fieldset> would be wrong; role="group" with the participant name labels the tile.
    <div
      role="group"
      aria-label={tileName(local)}
      data-testid="km-local-tile"
      data-video-processor={processor}
      className={tileClass}
    >
      <TileBody
        participant={local}
        video={
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 size-full -scale-x-100 object-cover"
          />
        }
      />
    </div>
  );
}

export function RemoteTile({
  room,
  remote,
}: {
  readonly room: RealtimeRoom;
  readonly remote: RemoteParticipant;
}) {
  const videoRef = useMediaBinding<HTMLVideoElement>(room, remote.identity, "camera");
  const audioRef = useMediaBinding<HTMLAudioElement>(room, remote.identity, "microphone");
  return (
    // biome-ignore lint/a11y/useSemanticElements: a video tile is not a form group, so <fieldset> would be wrong; role="group" with the participant name labels the tile.
    <div
      role="group"
      aria-label={tileName(remote)}
      data-testid="km-remote-tile"
      data-participant-identity={remote.identity}
      className={tileClass}
    >
      <TileBody
        participant={remote}
        muteTestId="km-participant-muted"
        video={
          <video
            ref={videoRef}
            data-testid="km-remote-video"
            autoPlay
            muted
            playsInline
            className="absolute inset-0 size-full object-cover"
          />
        }
      />
      {/* biome-ignore lint/a11y/useMediaCaption: live meeting audio has no caption track; captions are out of this release (web-release-acceptance.md 5.8) */}
      <audio ref={audioRef} data-testid="km-remote-audio" autoPlay />
    </div>
  );
}
