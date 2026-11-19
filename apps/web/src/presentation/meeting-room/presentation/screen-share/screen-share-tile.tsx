// TJ-ARCH-MOB-001 compliant
// meet.html `.share-tile` (WC-1): one tile per screen shared in the room, local first,
// spanning the whole stage row above the person tiles. The shared screen is letterboxed
// (`object-fit: contain`) on the `media-bg` fill, at most 52vh tall, so text on it stays
// readable. A chip names who presents; the local tile also says who sees the share.
// Media is bound through the port: the <video> plays the `screen-share` medium (muted;
// its sound, when the sharer included tab or system audio, plays from a separate
// <audio> for remote shares only, so nobody hears their own tab). Scenario contract:
// km-screen-share-tile with data-participant-identity, km-screen-share-video with
// data-track-source="screen_share" (the LiveKit Track.Source value).
import type { RealtimeRoom } from "@know-meet/application";
import type { ScreenShare } from "@know-meet/domain";
import { Spinner } from "@know-meet/ui/components/spinner";
import { useMediaBinding } from "../use-media-binding";
import { remoteShareHead, remoteShareName, SHARE_COPY } from "./screen-share-copy";

const SHARE_TRACK_SOURCE = "screen_share";

const tagClass =
  "block min-w-0 truncate rounded-6 bg-media-tag-bg px-s2 py-0.5 text-sm font-semibold text-on-media";

function RemoteShareAudio({
  room,
  share,
}: {
  readonly room: RealtimeRoom;
  readonly share: ScreenShare;
}) {
  const audioRef = useMediaBinding<HTMLAudioElement>(room, share.identity, "screen-share-audio");
  // biome-ignore lint/a11y/useMediaCaption: live shared-tab audio has no caption track; captions are out of this release (web-release-acceptance.md 5.8)
  return <audio ref={audioRef} data-testid="km-screen-share-audio" autoPlay />;
}

interface ScreenShareTileProps {
  readonly room: RealtimeRoom;
  readonly share: ScreenShare;
  /** The sharer's display name; null for the local share. */
  readonly sharerName: string | null;
}

export function ScreenShareTile({ room, share, sharerName }: ScreenShareTileProps) {
  const videoRef = useMediaBinding<HTMLVideoElement>(room, share.identity, "screen-share");
  const name = sharerName ?? "";
  const label = share.isLocal ? SHARE_COPY.localName : remoteShareName(name);
  const head = share.isLocal ? SHARE_COPY.localHead : remoteShareHead(name);
  return (
    // biome-ignore lint/a11y/useSemanticElements: a video tile is not a form group, so <fieldset> would be wrong; role="group" with the share's name labels the tile.
    <div
      role="group"
      aria-label={label}
      data-testid="km-screen-share-tile"
      data-participant-identity={share.identity}
      className="relative isolate col-span-full overflow-hidden rounded-tile bg-media-bg"
    >
      <video
        ref={videoRef}
        data-testid="km-screen-share-video"
        data-track-source={SHARE_TRACK_SOURCE}
        autoPlay
        muted
        playsInline
        className="block aspect-video max-h-[52vh] w-full object-contain"
      />
      {share.subscribed ? null : (
        <div className="absolute inset-0 grid place-items-center gap-s2 text-on-media">
          <span className="inline-flex items-center gap-s2 rounded-6 bg-media-tag-bg px-s3 py-s1 text-sm font-semibold">
            <Spinner role="presentation" aria-label={undefined} aria-hidden="true" />
            {SHARE_COPY.waiting}
          </span>
        </div>
      )}
      <div className="absolute inset-x-0 top-0 flex items-center gap-s2 px-s3 pt-s3">
        <span className={tagClass}>{head}</span>
      </div>
      {share.isLocal ? (
        <div className="absolute inset-x-0 bottom-0 flex items-center px-s3 pb-s3">
          <span className={tagClass}>{SHARE_COPY.localFoot}</span>
        </div>
      ) : null}
      {!share.isLocal && share.hasAudio ? <RemoteShareAudio room={room} share={share} /> : null}
    </div>
  );
}
