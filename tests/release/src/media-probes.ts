/**
 * Observations of real media in the meeting room (WR-1). Each probe reads the
 * DOM media element the UI contract names and the MediaStreamTrack attached to
 * it, so a tile that renders without a subscribed track cannot pass.
 */
import { expect, type Locator, type Page } from "@playwright/test";
import { CONNECT_TIMEOUT_MS } from "./meeting-flow.ts";
import { ROOM } from "./test-ids.ts";

export interface VideoObservation {
  readonly liveVideoTrack: boolean;
  readonly videoWidth: number;
  readonly videoHeight: number;
  readonly boxWidth: number;
  readonly boxHeight: number;
}

export interface AudioObservation {
  readonly liveAudioTrack: boolean;
}

export function remoteTiles(page: Page): Locator {
  return page.getByTestId(ROOM.remoteTile);
}

export async function observeVideo(tile: Locator): Promise<VideoObservation> {
  return tile.getByTestId(ROOM.remoteVideo).evaluate((element) => {
    const video = element as HTMLVideoElement;
    const stream = video.srcObject;
    const box = video.getBoundingClientRect();
    return {
      liveVideoTrack:
        stream instanceof MediaStream &&
        stream.getVideoTracks().some((track) => track.readyState === "live"),
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      boxWidth: box.width,
      boxHeight: box.height,
    };
  });
}

export async function observeAudio(tile: Locator): Promise<AudioObservation> {
  return tile.getByTestId(ROOM.remoteAudio).evaluate((element) => {
    const stream = (element as HTMLAudioElement).srcObject;
    return {
      liveAudioTrack:
        stream instanceof MediaStream &&
        stream.getAudioTracks().some((track) => track.readyState === "live"),
    };
  });
}

function rendered(video: VideoObservation): boolean {
  return (
    video.liveVideoTrack &&
    video.videoWidth > 0 &&
    video.videoHeight > 0 &&
    video.boxWidth > 0 &&
    video.boxHeight > 0
  );
}

export interface RemoteMediaReport {
  readonly remoteParticipants: number;
  readonly video: VideoObservation;
  readonly audio: AudioObservation;
}

/**
 * Exactly one remote participant whose subscribed video has decoded frames and
 * a non-zero rendered box, and whose subscribed audio track is live.
 */
export async function expectOneRemoteWithMedia(
  page: Page,
  label: string,
): Promise<RemoteMediaReport> {
  const tiles = remoteTiles(page);
  await expect(tiles, `${label}: remote participants`).toHaveCount(1, {
    timeout: CONNECT_TIMEOUT_MS,
  });
  const tile = tiles.first();
  await expect
    .poll(async () => rendered(await observeVideo(tile)), {
      message: `${label}: remote video track subscribed and rendered larger than zero`,
      timeout: CONNECT_TIMEOUT_MS,
    })
    .toBe(true);
  await expect
    .poll(async () => (await observeAudio(tile)).liveAudioTrack, {
      message: `${label}: remote audio track subscribed and live`,
      timeout: CONNECT_TIMEOUT_MS,
    })
    .toBe(true);
  return {
    remoteParticipants: await tiles.count(),
    video: await observeVideo(tile),
    audio: await observeAudio(tile),
  };
}

/** The single remote tile in `page` shows (or stops showing) the muted indicator. */
export async function expectRemoteMuted(page: Page, muted: boolean, label: string): Promise<void> {
  const indicator = remoteTiles(page).first().getByTestId(ROOM.participantMuted);
  if (muted) {
    await expect(indicator, `${label}: remote shown as muted`).toBeVisible({
      timeout: CONNECT_TIMEOUT_MS,
    });
  } else {
    await expect(indicator, `${label}: remote not shown as muted`).toBeHidden({
      timeout: CONNECT_TIMEOUT_MS,
    });
  }
}
