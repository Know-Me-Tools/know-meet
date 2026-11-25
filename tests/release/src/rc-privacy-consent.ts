import { type BrowserContext, expect, type Page } from "@playwright/test";
import { readOutcomeBrowser } from "./rc-outcomes-browser.ts";
import { blocked } from "./release-env.ts";

export interface Challenge {
  readonly requestId: string;
  readonly admissionId: number;
}

interface AnswerFault extends Challenge {
  readonly replacement?: Challenge;
}

interface FaultState {
  pending: AnswerFault | null;
  observed: { answer: string; sent: Challenge | null } | null;
}

type ConsentWindow = Window & { __kmConsentFault?: FaultState };

/** Substitute one answer at the SDK's UTF-8 send boundary. All other sends are native. */
export async function installConsentFault(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    const state: FaultState = { pending: null, observed: null };
    (window as ConsentWindow).__kmConsentFault = state;
    const encode = TextEncoder.prototype.encode;
    TextEncoder.prototype.encode = function (input) {
      const fault = state.pending;
      if (fault === null || typeof input !== "string" || !input.startsWith('{"v":')) {
        return encode.call(this, input);
      }
      if (!/^\{"v":\d+,"type":"record-answer"[^{}]+\}$/.test(input)) {
        return encode.call(this, input);
      }
      const message = JSON.parse(input) as WireConsent;
      if (
        message.requestId !== fault.requestId ||
        message.admissionId !== fault.admissionId ||
        (message.answer !== "agreed" && message.answer !== "declined")
      )
        return encode.call(this, input);

      state.pending = null;
      const replacement = fault.replacement;
      state.observed = {
        answer: message.answer,
        sent: replacement ?? null,
      };
      if (replacement === undefined) {
        throw new DOMException("Controlled consent send failure", "OperationError");
      }
      // The SDK still generates the sender, stream framing and byte length, then sends it
      // over the real RTC path. The recipient observes the stale payload independently.
      return encode.call(
        this,
        JSON.stringify({
          ...message,
          requestId: replacement.requestId,
          admissionId: replacement.admissionId,
        }),
      );
    };
  });
}

export async function armConsentFault(page: Page, fault: AnswerFault): Promise<void> {
  await page.evaluate((pending) => {
    const state = (window as ConsentWindow).__kmConsentFault;
    if (state === undefined) throw new Error("BLOCKED: consent transport fixture unavailable");
    state.pending = pending;
    state.observed = null;
  }, fault);
}

export async function observedConsentFault(page: Page): Promise<FaultState["observed"]> {
  return page.evaluate(() => (window as ConsentWindow).__kmConsentFault?.observed ?? null);
}

interface WireConsent extends Challenge {
  readonly type: string;
  readonly phase?: string;
  readonly answer?: string;
}

async function consentReceipts(page: Page) {
  return (await readOutcomeBrowser(page)).flatMap(({ kind, at, detail }) => {
    if (kind !== "consent-received" || detail === undefined) return [];
    const message = JSON.parse(detail) as WireConsent;
    return [{ at, message }];
  });
}

export async function runningChallenge(page: Page, previous?: Challenge): Promise<Challenge> {
  const failure = "late admission challenge not observed on the normal LiveKit receiver";
  let challenge: Challenge | undefined;
  try {
    await expect
      .poll(
        async () => {
          challenge = (await consentReceipts(page)).findLast(
            ({ message }) =>
              message.type === "record-request" &&
              message.phase === "running" &&
              Number.isSafeInteger(message.admissionId) &&
              message.admissionId > 0 &&
              (previous === undefined ||
                (message.requestId === previous.requestId &&
                  message.admissionId > previous.admissionId)),
          )?.message;
          return challenge;
        },
        { timeout: 4_000, message: failure },
      )
      .toBeDefined();
  } catch {
    throw blocked(failure);
  }
  if (challenge === undefined) throw blocked(failure);
  return challenge;
}

export async function matchingConsentReceipt(
  page: Page,
  challenge: Challenge,
  answer: "agreed" | "declined",
): Promise<number> {
  const failure = `matching late ${answer} was not independently observed at the recorder`;
  let receiptAt: number | undefined;
  try {
    await expect
      .poll(
        async () => {
          receiptAt = (await consentReceipts(page)).findLast(
            ({ message }) =>
              message.type === "record-answer" &&
              message.answer === answer &&
              message.requestId === challenge.requestId &&
              message.admissionId === challenge.admissionId,
          )?.at;
          return receiptAt;
        },
        { timeout: 4_000, message: failure },
      )
      .toBeDefined();
  } catch {
    throw blocked(failure);
  }
  if (receiptAt === undefined) throw blocked(failure);
  return receiptAt;
}
