import { expect, type Page, type TestInfo } from "@playwright/test";
import { attachJson } from "./evidence.ts";
import { type OutcomeEvent, readOutcomeBrowser } from "./rc-outcomes-browser.ts";
import { readBrowserMedia } from "./rc-privacy-media.ts";
import { blocked } from "./release-env.ts";
import { RECORDING } from "./wc-test-ids.ts";

export function eventOf(events: readonly OutcomeEvent[], kind: string): OutcomeEvent {
  const value = events.find((event) => event.kind === kind);
  if (value === undefined) throw blocked(`no independent browser observation for ${kind}`);
  return value;
}

export async function waitForEvents(page: Page, kind: string, count = 1, timeout = 15_000) {
  try {
    await expect
      .poll(
        async () => (await readOutcomeBrowser(page)).filter((event) => event.kind === kind).length,
        { timeout, message: `observed ${kind}` },
      )
      .toBeGreaterThanOrEqual(count);
  } catch (cause) {
    throw new Error(`BLOCKED: missing browser receipt for ${kind}`, { cause });
  }
  return (await readOutcomeBrowser(page)).filter((event) => event.kind === kind);
}

export async function attachOutcomeEvidence(testInfo: TestInfo, page: Page, name: string) {
  if (page.isClosed()) return;
  await attachJson(testInfo, `${name}.json`, {
    browser: await readOutcomeBrowser(page),
    source: await readBrowserMedia(page),
  });
}

interface DepartureTrace {
  readonly leave: number;
  readonly disconnect: number;
  readonly submission: number;
  readonly usable: number;
  readonly writerReleased: number;
  readonly oldFinished: number;
  readonly newRoomUsableAfterOld: boolean;
}

export function departureRejection(trace: DepartureTrace): string | null {
  if (
    trace.disconnect < trace.leave ||
    trace.disconnect - trace.leave > 2000 ||
    trace.disconnect >= trace.writerReleased
  )
    return "disconnect waited for finalization";
  if (
    trace.usable < trace.submission ||
    trace.usable - trace.submission > 5000 ||
    trace.usable >= trace.writerReleased
  )
    return "rejoin waited for finalization";
  if (trace.oldFinished < trace.writerReleased) return "writer hold lacked a final receipt";
  if (!trace.newRoomUsableAfterOld) return "old completion changed the new room";
  return null;
}

interface NoticeTrace {
  readonly recognized: number;
  readonly notice: number | undefined;
  readonly completion: number | undefined;
}

export function noticeRejection(trace: NoticeTrace): string | null {
  if (trace.notice === undefined) return "failure notice missing";
  if (trace.notice < trace.recognized || trace.notice - trace.recognized > 1000) {
    return "failure notice outside 1000 ms";
  }
  if (trace.completion !== undefined && trace.notice >= trace.completion) {
    return "failure notice stayed behind writer finalization";
  }
  return null;
}

interface CoverageTrack {
  readonly early: boolean;
  readonly late: boolean;
  readonly progressing: boolean;
  readonly decodedEndMs: number;
}

export function completenessRejection(
  intendedVideoMs: number,
  video: CoverageTrack,
  audio: CoverageTrack,
  intendedAudioMs = intendedVideoMs,
): string | null {
  for (const [kind, observation, intendedMs] of [
    ["video", video, intendedVideoMs],
    ["audio", audio, intendedAudioMs],
  ] as const) {
    if (!observation.early || !observation.late || !observation.progressing) {
      return `missing advancing early/late ${kind} markers`;
    }
    if (Math.abs(intendedMs - observation.decodedEndMs) > 200) {
      return `decoded ${kind} end differs from intended end by over 200 ms`;
    }
  }
  return null;
}

/** The condition chip is absent for Complete. Other outcomes have visible copy. */
export async function expectLibraryCondition(
  page: Page,
  condition: "complete" | "incomplete" | "unusable",
  timeout = 20_000,
) {
  const entry = page.getByTestId(RECORDING.item);
  await expect(entry).toHaveCount(1, { timeout });
  if (condition === "complete") {
    await expect(entry.getByText(/Incomplete|Recording failed|File missing/)).toHaveCount(0);
  } else {
    await expect(
      entry.getByText(condition === "incomplete" ? "Incomplete" : "Recording failed", {
        exact: true,
      }),
    ).toBeVisible({ timeout: 20_000 });
  }
  await entry.click();
  const player = page.getByTestId(RECORDING.player);
  if (condition === "unusable") {
    await expect(page.getByText(/no playable clip/)).toBeVisible();
    await expect(player).toHaveCount(0);
    return;
  }
  await expect(player).toBeVisible({ timeout: 20_000 });
  await page.getByTestId(RECORDING.play).click();
  await expect
    .poll(() => player.evaluate((video) => (video as HTMLVideoElement).currentTime), {
      timeout: 10_000,
    })
    .toBeGreaterThan(0.1);
}
