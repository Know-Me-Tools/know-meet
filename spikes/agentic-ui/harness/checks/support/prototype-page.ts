/** Page object for a prototype implementing contract.md. */
import { expect, type Locator, type Page } from "@playwright/test";
import type { RunStatus, SpikeSnapshot } from "../../src/domain/spike-probe.ts";
import { HARNESS_URL, newSessionId, pacingOverrides, spikeUrl } from "./env.ts";
import { harnessApi, requestCount } from "./harness-api.ts";
import { installInstrumentation } from "./page-instrumentation.ts";

export const SETTLED: readonly RunStatus[] = ["finished", "interrupted", "cancelled", "error"];
const POLL_MS = 100;

export class PrototypePage {
  readonly page: Page;
  readonly scenarioId: string;
  readonly sessionId: string;

  private constructor(page: Page, scenarioId: string, sessionId: string) {
    this.page = page;
    this.scenarioId = scenarioId;
    this.sessionId = sessionId;
  }

  /** Installs instrumentation, loads the prototype for a scenario and waits for `__spike.ready`. */
  static async open(page: Page, scenarioId: string): Promise<PrototypePage> {
    const proto = new PrototypePage(page, scenarioId, newSessionId(scenarioId));
    await page.addInitScript(installInstrumentation);
    await page.goto(proto.url().toString(), { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__spike?.ready === true, undefined, { polling: POLL_MS, timeout: 15_000 });
    const version = await page.evaluate(() => window.__spike?.contractVersion);
    expect(version, "window.__spike.contractVersion").toBe(1);
    return proto;
  }

  url(): URL {
    const url = spikeUrl();
    const harnessOrigin = new URL(HARNESS_URL).origin;
    url.searchParams.set("scenario", this.scenarioId);
    url.searchParams.set("agui", HARNESS_URL);
    url.searchParams.set("session", this.sessionId);
    url.searchParams.set("allowMediaOrigin", harnessOrigin);
    for (const [key, value] of Object.entries(pacingOverrides())) url.searchParams.set(key, value);
    return url;
  }

  get transcript(): Locator {
    return this.page.getByTestId("km-transcript");
  }

  get composerInput(): Locator {
    return this.page.getByTestId("km-composer-input");
  }

  async submitPrompt(text: string): Promise<void> {
    await this.composerInput.fill(text);
    await this.page.evaluate(() => {
      if (window.__km !== undefined) window.__km.marks["submit"] = performance.now();
    });
    await this.page.getByTestId("km-composer-submit").click();
  }

  snapshot(): Promise<SpikeSnapshot> {
    return this.page.evaluate(() => {
      const probe = window.__spike;
      if (probe === undefined) throw new Error("window.__spike disappeared");
      return probe.snapshot();
    });
  }

  async waitForStatus(statuses: readonly RunStatus[], timeout = 60_000): Promise<RunStatus> {
    const handle = await this.page.waitForFunction(
      (wanted: readonly string[]) => {
        const status = window.__spike?.snapshot().runStatus;
        return status !== undefined && wanted.includes(status) ? status : false;
      },
      statuses,
      { polling: POLL_MS, timeout },
    );
    return (await handle.jsonValue()) as RunStatus;
  }

  /** Waits until the run settles; `exclude` skips statuses (e.g. "interrupted" after a resume). */
  waitForSettled(exclude: readonly RunStatus[] = [], timeout = 60_000): Promise<RunStatus> {
    return this.waitForStatus(SETTLED.filter((s) => !exclude.includes(s)), timeout);
  }

  /** Waits until any assistant message holds at least `chars` characters of text. */
  async waitForAssistantText(chars: number, timeout = 30_000): Promise<void> {
    await this.page.waitForFunction(
      (min: number) => (window.__spike?.snapshot().messages ?? []).some((m) => m.role === "assistant" && m.text.length >= min),
      chars,
      { polling: 50, timeout },
    );
  }

  /** Waits until the server has seen more than `previous` requests for this session. */
  async waitForRequestsAbove(previous: number, timeout = 15_000): Promise<number> {
    let latest = previous;
    await expect
      .poll(async () => {
        latest = await requestCount(this.sessionId);
        return latest;
      }, { timeout, message: `server request count for ${this.sessionId} to exceed ${previous}` })
      .toBeGreaterThan(previous);
    return latest;
  }

  /** Waits until the server has finished writing every response for this session. */
  async waitForServerIdle(timeout = 60_000): Promise<void> {
    await expect
      .poll(async () => (await harnessApi.session(this.sessionId))?.log.requests.filter((r) => r.outcome === "in-progress").length ?? 0, {
        timeout,
        message: `server responses for ${this.sessionId} to finish`,
      })
      .toBe(0);
  }

  requestCount(): Promise<number> {
    return requestCount(this.sessionId);
  }

  approval(interruptId: string): Locator {
    return this.page.locator(`[data-testid="km-approval"][data-interrupt-id="${interruptId}"]`);
  }

  /** Presses Tab until `target` is focused (proves keyboard reachability). */
  async tabTo(target: Locator, maxPresses = 80): Promise<void> {
    for (let i = 0; i < maxPresses; i += 1) {
      if (await target.evaluate((el) => el === document.activeElement)) return;
      await this.page.keyboard.press("Tab");
    }
    throw new Error(`could not reach ${target.toString()} with ${maxPresses} Tab presses`);
  }

  activeTestId(): Promise<string | null> {
    return this.page.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? null);
  }
}
