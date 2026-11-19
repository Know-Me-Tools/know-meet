/**
 * WC-8 A consented recording runs, saves locally and plays back
 * (features/wc-8-local-recording.feature). Packaged then hosted, Chromium.
 *
 * Three witnesses (wc-recording.ts): the indicator, MediaRecorder counts from
 * the page tap, and files in the origin private file system. The recording
 * bytes must not leave the device (findRecordingEgress, scope in wc-network.ts).
 * The library is a real route of the hosted build (/recordings), reached through
 * the shared adaptive navigation (Home, History, Recordings) after leaving the room.
 */
import { expect, test } from "@playwright/test";
import { attachJson, attachScreenshot } from "./src/evidence.ts";
import { expectOneRemoteWithMedia } from "./src/media-probes.ts";
import { findRecordingEgress, summarise } from "./src/wc-network.ts";
import {
  answerConsent,
  DURATION_TOLERANCE_MS,
  diskBaselines,
  expectIndicator,
  notRecordingProbe,
  observePlayer,
  openLibraryAfterLeaving,
  RECORD_WINDOW_MS,
  readLibrary,
  requestRecording,
  stopRecording,
} from "./src/wc-recording.ts";
import { closeAll, holdsFor, joinRoom, newParticipant, startRoom } from "./src/wc-room.ts";
import { opfsEntries, readTaps } from "./src/wc-taps.ts";
import { RECORDING } from "./src/wc-test-ids.ts";

const TEST_TIMEOUT_MS = 6 * 60 * 1000;
const PENDING_WINDOW_MS = 5_000;

test.describe("WC-8 A consented recording runs, saves locally and plays back", () => {
  test(
    "nothing records before B answers; after B agrees both show the indicator; 20 s later the library has one playable recording",
    { tag: ["@WC-8", "@value-critical", "@smoke"] },
    async ({ browser, baseURL }, testInfo) => {
      test.setTimeout(TEST_TIMEOUT_MS);
      const a = await newParticipant(browser, "Guest A", testInfo, { har: true });
      const b = await newParticipant(browser, "Guest B", testInfo, { har: true });
      try {
        const code = await startRoom(a);
        await joinRoom(b, code);
        await expectOneRemoteWithMedia(a.page, "context A");
        await expectOneRemoteWithMedia(b.page, "context B");
        const baselines = await diskBaselines([a, b]);

        await requestRecording(a.page);
        await expect(b.page.getByTestId(RECORDING.prompt), "B is prompted").toBeVisible();

        // Negative control: while B has not answered, nothing records anywhere.
        await holdsFor(a.page, PENDING_WINDOW_MS, "nothing records before B answers", () =>
          notRecordingProbe(baselines),
        );
        await attachScreenshot(testInfo, b.page, "wc-8-b-prompt");

        await answerConsent(b.page, true);
        await expectIndicator(a.page, true, "A shows the indicator");
        await expectIndicator(b.page, true, "B shows the indicator");
        await attachScreenshot(testInfo, a.page, "wc-8-a-indicator");
        await attachScreenshot(testInfo, b.page, "wc-8-b-indicator");

        await holdsFor(a.page, RECORD_WINDOW_MS, "recording keeps running for 20 s", async () => {
          const onA = await a.page.getByTestId(RECORDING.indicator).count();
          const onB = await b.page.getByTestId(RECORDING.indicator).count();
          return onA === 1 && onB === 1 ? null : `indicator count A=${onA} B=${onB}`;
        });
        await stopRecording(a.page);
        await expectIndicator(b.page, false, "B's indicator goes when A stops");

        const recorder = (await readTaps(a.page)).recorder;
        expect(recorder.started, "A's MediaRecorder started once").toBe(1);
        expect(recorder.stopped, "A's MediaRecorder stopped").toBeGreaterThanOrEqual(1);
        expect(recorder.bytes, "A's MediaRecorder produced data").toBeGreaterThan(0);
        const files = await opfsEntries(a.page);
        const added = files.filter((f) => !baselines[0]?.files.some((old) => old.path === f.path));
        expect(added.length, "exactly one new file on A's disk").toBe(1);
        expect(added[0]?.size ?? 0, "that file has bytes").toBeGreaterThan(0);

        await openLibraryAfterLeaving(a.page);
        const library = await readLibrary(a.page);
        expect(library.length, "library lists one recording").toBe(1);
        const [item] = library;
        expect(
          Math.abs((item?.durationMs ?? 0) - RECORD_WINDOW_MS),
          "duration within 20 +/- 3 s",
        ).toBeLessThanOrEqual(DURATION_TOLERANCE_MS);
        expect(item?.sizeBytes ?? 0, "library size").toBeGreaterThan(0);

        // The card opens the detail at /recordings#recording:<id>, where the player is.
        await a.page.getByTestId(RECORDING.item).first().click();
        await a.page.getByTestId(RECORDING.play).click();
        const first = await observePlayer(a.page);
        expect(first.src.startsWith("blob:"), "playback reads a blob: URL").toBe(true);
        await expect
          .poll(async () => (await observePlayer(a.page)).currentTime, {
            message: "currentTime advances",
            timeout: 15_000,
          })
          .toBeGreaterThan(first.currentTime + 0.5);
        expect((await observePlayer(a.page)).paused, "player is playing").toBe(false);
        await attachScreenshot(testInfo, a.page, "wc-8-playback");

        // On-device: no recording bytes in any request, frame or page-level upload.
        for (const p of [a, b]) {
          const snapshot = await p.net.collect();
          await attachJson(testInfo, `wc-8-${p.name}-network.json`, summarise(snapshot));
          expect(snapshot.requests.length, `${p.name}: recorder saw traffic`).toBeGreaterThan(0);
          expect(
            findRecordingEgress(snapshot),
            `${p.name}: recording bytes left the device`,
          ).toEqual([]);
          expect(snapshot.cspViolations, `${p.name}: CSP violations`).toEqual([]);
          expect(snapshot.cspConsole, `${p.name}: CSP console`).toEqual([]);
        }
        await attachJson(testInfo, "wc-8-run.json", {
          roomCode: code,
          baseURL,
          library,
          addedFiles: added,
          recorder,
        });
      } finally {
        await closeAll([a, b]);
      }
    },
  );

  test(
    "the recording-egress detector flags a deliberate WebM upload",
    { tag: ["@WC-8", "@negative-control"] },
    async ({ browser }, testInfo) => {
      const p = await newParticipant(browser, "Guest Canary", testInfo);
      try {
        await p.page.goto("/");
        await p.page.route("https://canary.invalid/**", (route) =>
          route.fulfill({ status: 200, body: "ok" }),
        );
        // 70 000 bytes behind a WebM signature, typed video/webm, to a stubbed host.
        await p.page.evaluate(
          `fetch("https://canary.invalid/upload", { method: "POST", body: new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]), new Uint8Array(70000)], { type: "video/webm" }) }).catch(() => undefined)`,
        );
        await expect
          .poll(async () => findRecordingEgress(await p.net.collect()).length, {
            message: "the detector flags the deliberate upload",
          })
          .toBeGreaterThan(0);
        const flagged = findRecordingEgress(await p.net.collect());
        await attachJson(testInfo, "wc-8-canary.json", flagged);
      } finally {
        await closeAll([p]);
      }
    },
  );
});
