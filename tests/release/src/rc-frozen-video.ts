import { expect, type Page } from "@playwright/test";
import { attachJson } from "./evidence.ts";
import { readOutcomeBrowser, recordedFileBytes } from "./rc-outcomes-browser.ts";
import { eventOf, expectLibraryCondition, waitForEvents } from "./rc-outcomes-oracles.ts";
import { type Fixtures, outcomeParticipant, recordWith } from "./rc-outcomes-room.ts";
import { decodeLibraryRecording, decodeStoredRecording } from "./rc-privacy-decode.ts";
import { freezeMarkerVideo, readBrowserMedia, setMarkerPhase } from "./rc-privacy-media.ts";
import { openLibraryAfterLeaving, stopRecording } from "./wc-recording.ts";
import { startRoom } from "./wc-room.ts";

type FreezeWindow = Window & { __kmFrozenVideoAt?: number };

/** Substitute only the compositor's capture track. The original canvas and room inputs advance. */
async function freezeEncoderVideo(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const capture = HTMLCanvasElement.prototype.captureStream;
    const draw = CanvasRenderingContext2D.prototype.drawImage as (
      input: CanvasImageSource,
      ...coordinates: number[]
    ) => void;
    const freeze = new WeakMap<HTMLCanvasElement, () => void>();

    HTMLCanvasElement.prototype.captureStream = function (this: HTMLCanvasElement, rate) {
      if (this.width !== 1280 || this.height !== 720) return capture.call(this, rate);
      // This canvas stays observable whichever init-script wrapper was installed last.
      window.dispatchEvent(new CustomEvent("km-fixture-compositor-source", { detail: this }));
      const canvas = (): HTMLCanvasElement =>
        Object.assign(document.createElement("canvas"), {
          width: this.width,
          height: this.height,
        });
      const relay = canvas();
      const frozen = canvas();
      const relayContext = relay.getContext("2d", { alpha: false });
      const frozenContext = frozen.getContext("2d", { alpha: false });
      if (relayContext === null || frozenContext === null)
        throw new Error("BLOCKED: encoder relay canvas unavailable");
      let image: HTMLCanvasElement = this;
      freeze.set(this, () => {
        freeze.delete(this);
        queueMicrotask(() => {
          draw.call(frozenContext, this, 0, 0);
          image = frozen;
          (window as FreezeWindow).__kmFrozenVideoAt = performance.timeOrigin + performance.now();
        });
      });
      relayContext.fillRect(0, 0, relay.width, relay.height);
      const stream = capture.call(relay, 0);
      const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;
      if (track === undefined) throw new Error("BLOCKED: encoder relay video track unavailable");
      let frame = 0;
      const submit = (): void => {
        draw.call(relayContext, image, 0, 0);
        // Change one corner pixel so identical frozen pictures still produce capture frames.
        relayContext.fillStyle = frame % 2 === 0 ? "#000" : "#fff";
        relayContext.fillRect(0, 0, 1, 1);
        frame += 1;
        track.requestFrame();
      };
      submit();
      const timer = window.setInterval(() => {
        if (track.readyState === "ended") {
          window.clearInterval(timer);
          return;
        }
        submit();
      }, 40);
      return stream;
    };

    CanvasRenderingContext2D.prototype.drawImage = function (
      this: CanvasRenderingContext2D,
      image: CanvasImageSource,
      ...coordinates: number[]
    ) {
      draw.call(this, image, ...coordinates);
      if (
        image instanceof HTMLVideoElement &&
        image.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        freeze.get(this.canvas)?.();
      }
    } as typeof CanvasRenderingContext2D.prototype.drawImage;
  });
}

async function decodeFrozenRecording(page: Page, f: Fixtures) {
  await waitForEvents(page, "writer-closed");
  const name = eventOf(await readOutcomeBrowser(page), "writer-open-request").detail;
  if (name === undefined) throw new Error("BLOCKED: recorder writer file name unavailable");
  const bytes = Buffer.from(await recordedFileBytes(page, name));
  return decodeStoredRecording(bytes, f.testInfo, "rc-4-frozen-output");
}

export async function recordedVideoProgress(
  f: Fixtures,
  mode: "frozen-output" | "still-source",
): Promise<void> {
  const a = await outcomeParticipant(f, "A");
  if (mode === "frozen-output") await freezeEncoderVideo(a.page);
  await startRoom(a);
  if (mode === "still-source") await freezeMarkerVideo(a.page);
  await recordWith(a, []);
  if (mode === "frozen-output") {
    await a.page.waitForFunction(
      () => {
        const frozenAt = (window as FreezeWindow).__kmFrozenVideoAt;
        return (
          frozenAt !== undefined && performance.timeOrigin + performance.now() - frozenAt >= 650
        );
      },
      undefined,
      { polling: 25, timeout: 5_000 },
    );
    await setMarkerPhase(a.page, 1);
  }
  await waitForEvents(a.page, "encoder-chunk", 4);
  await stopRecording(a.page);

  const source = await readBrowserMedia(a.page);
  const frozenAt = await a.page.evaluate(() => (window as FreezeWindow).__kmFrozenVideoAt ?? null);
  const frames = source.events.filter((event) => event.kind === "compositor-frame");
  await attachJson(f.testInfo, `rc-4-${mode}-source.json`, { frames, frozenAt });
  const early = frames.filter((event) => event.value.startsWith("a0:"));
  expect(early.length, "the compositor draws known camera frames").toBeGreaterThan(1);
  if (mode === "frozen-output") {
    expect(
      frames.some(
        (event) => frozenAt !== null && event.at > frozenAt && event.value.startsWith("a1:"),
      ),
      "the source compositor advances after the encoder relay freezes",
    ).toBe(true);
  } else {
    expect(
      new Set(early.map((event) => event.value)).size,
      "the intended source picture stays still",
    ).toBe(1);
  }

  const frozen = mode === "frozen-output" ? await decodeFrozenRecording(a.page, f) : null;
  await openLibraryAfterLeaving(a.page);
  if (frozen === null) await expectLibraryCondition(a.page, "complete");
  const decoded = frozen ?? (await decodeLibraryRecording(a.page, f.testInfo, `rc-4-${mode}`));
  expect(decoded.video.a0, "the saved picture is playable").toBeGreaterThan(1);
  expect(decoded.videoProgress.a0, "the saved early picture stays visually still").toBe(1);
  expect(decoded.video.a1, "no advancing marker reached the stored picture").toBe(0);
  expect(decoded.audio.a0, "the saved audio remains playable").toBeGreaterThan(1);
  if (mode === "frozen-output") {
    expect(decoded.audio.a1, "audio advanced while the saved picture stayed still").toBeGreaterThan(
      1,
    );
    expect(
      Math.abs(decoded.audioEndMs - decoded.videoEndMs),
      "both encoded track timelines cover the clip",
    ).toBeLessThanOrEqual(200);
    await expectLibraryCondition(a.page, "incomplete");
  }
}
