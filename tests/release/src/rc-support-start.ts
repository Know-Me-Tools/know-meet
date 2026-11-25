import { type BrowserContext, expect, type Page, type TestInfo } from "@playwright/test";
import { attachJson } from "./evidence.ts";
import { RECORDING } from "./wc-test-ids.ts";

export const FAILURE_NOTICE_MS = 1_000;
export const UNAVAILABLE_TEXT = /Recording is unavailable in this browser/;
const FAILURE_TEXT = "Recording failed. Check Recordings for any playable part, then try again.";
const FAILURE_NOTE = "[role=status][aria-live=off]";

type StartMode = "unavailable" | "native-start-failure" | "observe";

interface StartWitness {
  readonly reachedNativeStart: number;
  readonly fixtureMadeStreamInactive: boolean | null;
  readonly nativeStartError: string | null;
  readonly failedAt: number | null;
  readonly noticeAt: number | null;
  readonly activeIndicatorSeen: boolean;
  readonly outputTracks: readonly { kind: string; state: MediaStreamTrackState }[];
}

export interface StartOutcome {
  readonly activeIndicatorSeen: boolean;
  readonly encoderStarts: number;
  readonly playableOrComplete: boolean;
}

export function falseSuccessSignals(outcome: StartOutcome): string[] {
  const signals: string[] = [];
  if (outcome.activeIndicatorSeen) signals.push("active indicator");
  if (outcome.encoderStarts > 0) signals.push("started encoder");
  if (outcome.playableOrComplete) signals.push("playable or complete library result");
  return signals;
}

export async function installStartWitness(context: BrowserContext, mode: StartMode): Promise<void> {
  await context.addInitScript(
    ({ variant, indicator, failureNote, failureText }) => {
      const read = {
        reachedNativeStart: 0,
        fixtureMadeStreamInactive: null as boolean | null,
        nativeStartError: null as string | null,
        failedAt: null as number | null,
        noticeAt: null as number | null,
        activeIndicatorSeen: false,
      };
      const outputTracks: MediaStreamTrack[] = [];
      new MutationObserver(() => {
        read.activeIndicatorSeen ||= document.querySelector(indicator) !== null;
        if (read.noticeAt === null) {
          const shown = [...document.querySelectorAll(failureNote)].some(
            (node) => node.textContent?.includes(failureText) && node.getClientRects().length > 0,
          );
          if (shown) read.noticeAt = performance.now();
        }
      }).observe(document, {
        childList: true,
        characterData: true,
        subtree: true,
        attributes: true,
      });
      Object.defineProperty(window, "__kmRecordingStartWitness", {
        value: () => ({
          ...read,
          outputTracks: outputTracks.map((track) => ({
            kind: track.kind,
            state: track.readyState,
          })),
        }),
      });
      if (variant === "unavailable") {
        Object.defineProperty(HTMLCanvasElement.prototype, "captureStream", {
          configurable: true,
          value: undefined,
        });
        return;
      }
      if (variant === "observe") return;

      const start = MediaRecorder.prototype.start;
      MediaRecorder.prototype.start = function (this: MediaRecorder, timeslice?: number) {
        read.reachedNativeStart += 1;
        const { stream } = this;
        const tracks = stream.getTracks();
        outputTracks.push(...tracks);
        // Only the encoder's stream membership changes. The tracks stay live so production
        // teardown, rather than the fixture, has to end both recorder outputs.
        for (const track of tracks) stream.removeTrack(track);
        read.fixtureMadeStreamInactive =
          !stream.active && tracks.every((track) => track.readyState === "live");
        try {
          start.call(this, timeslice);
        } catch (error) {
          read.failedAt = performance.now();
          read.nativeStartError = error instanceof DOMException ? error.name : String(error);
          throw error;
        } finally {
          for (const track of tracks) stream.addTrack(track);
        }
      };
    },
    {
      variant: mode,
      indicator: `[data-testid="${RECORDING.indicator}"]`,
      failureNote: FAILURE_NOTE,
      failureText: FAILURE_TEXT,
    },
  );
}

export async function readStartWitness(page: Page): Promise<StartWitness> {
  return page.evaluate<StartWitness>("window.__kmRecordingStartWitness()");
}

export async function expectFailureNotice(page: Page, testInfo: TestInfo): Promise<void> {
  const notice = page.locator(FAILURE_NOTE).getByText(FAILURE_TEXT, { exact: true });
  await expect(notice, "visible recorder failure").toBeVisible();
  const witness = await readStartWitness(page);
  await attachJson(testInfo, "rc-5-native-start-witness.json", witness);
  expect(witness.reachedNativeStart, "startup reached the actual browser encoder").toBe(1);
  expect(witness.fixtureMadeStreamInactive, "native encoder received an inactive stream").toBe(
    true,
  );
  expect(witness.nativeStartError, "native MediaRecorder rejected the inactive stream").toBe(
    "NotSupportedError",
  );
  expect(witness.failedAt).not.toBeNull();
  expect(witness.noticeAt).not.toBeNull();
  const noticeMs = (witness.noticeAt ?? 0) - (witness.failedAt ?? 0);
  expect(noticeMs, "the visible notice followed the native failure").toBeGreaterThanOrEqual(0);
  expect(noticeMs, "the notice is shown within 1000 ms of the native failure").toBeLessThanOrEqual(
    FAILURE_NOTICE_MS,
  );
  expect(witness.outputTracks).toEqual(
    expect.arrayContaining([
      { kind: "audio", state: "ended" },
      { kind: "video", state: "ended" },
    ]),
  );
}
