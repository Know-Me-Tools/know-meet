/**
 * WR-4 The public token endpoint bounds abuse (features/wr-4-token-abuse.feature).
 * Runs in both projects, in file order: the rate-limit tests share one client bucket,
 * so each burst first waits for the bucket to refill. Limits and lifetime come
 * from the deployed configuration (release-env.ts) and are recorded.
 * The runner, not this suite, is one client: behind the Gateway the bucket is
 * keyed on the forwarded client address.
 */
import { expect, test } from "@playwright/test";
import {
  createMeeting,
  decodeJwtClaims,
  issuedCode,
  requestToken,
  sleep,
  unissuedCode,
} from "./src/api-client.ts";
import { carriesToken, isApiError, isTokenResponse, STATUS } from "./src/api-contract.ts";
import { attachJson } from "./src/evidence.ts";
import { abuseLimits } from "./src/release-env.ts";

const FOREIGN_ORIGIN = "https://attacker.example";
/** Clock skew tolerated between the runner and the service, in seconds. */
const CLOCK_SKEW_SECONDS = 30;
/** Grants a guest token must never carry (admin or room creation). */
const FORBIDDEN_GRANTS = ["roomAdmin", "ingressAdmin", "roomCreate"] as const;
const SLACK_MS = 60_000;

/**
 * Waits until the runner's bucket has refilled, so earlier specs (or the
 * previous test) cannot turn this test's requests into 429s.
 */
async function freshBucket(): Promise<void> {
  const { refillSeconds } = abuseLimits();
  test.setTimeout(2 * refillSeconds * 1000 + SLACK_MS);
  await sleep(refillSeconds * 1000);
}

// Order within this file matters (bursts wait for a refill); the config runs one worker with
// fullyParallel off, so tests run in file order. Not "serial" mode: one failure must not skip
// the remaining abuse checks.

test.describe("WR-4 The public token endpoint bounds abuse", () => {
  test(
    "a token is issued only for a generated code and is narrowly scoped",
    { tag: ["@WR-4", "@value-critical"] },
    async ({ request, baseURL }, testInfo) => {
      const limits = abuseLimits();
      await attachJson(testInfo, "wr-4-limits.json", limits);
      // The below-limit control needs room for one create plus at least one token request.
      expect(limits.burst, "configured burst").toBeGreaterThanOrEqual(2);
      const { tokenTtlSeconds } = limits;
      await freshBucket();
      const origin = new URL(baseURL ?? "").origin;
      const code = await issuedCode(request, { origin });

      const issuedAt = Math.floor(Date.now() / 1000);
      const response = await requestToken(request, code, "Guest A", { origin });
      expect(response.status(), "POST /api/token status").toBe(STATUS.ok);
      const body: unknown = await response.json();
      expect(isTokenResponse(body), "token body matches the contract").toBe(true);
      const data = (body as { data: { token: string; room: string; expiresIn: number } }).data;
      expect(data.room, "response room is the issued code").toBe(code);
      expect(data.expiresIn, "expiresIn is the configured lifetime").toBeLessThanOrEqual(
        tokenTtlSeconds,
      );

      const claims = decodeJwtClaims(data.token);
      await attachJson(testInfo, "wr-4-claims-without-signature.json", { code, claims });
      const video = claims["video"];
      expect(typeof video === "object" && video !== null, "token has a video grant").toBe(true);
      const grant = video as Record<string, unknown>;
      expect(grant["room"], "grant names exactly the issued room").toBe(code);
      expect(grant["roomJoin"], "grant allows joining").toBe(true);
      for (const name of FORBIDDEN_GRANTS) {
        expect(grant[name] === true, `no ${name} grant`).toBe(false);
      }
      const exp = claims["exp"];
      expect(typeof exp, "token has an expiry").toBe("number");
      expect(exp as number, "expires within the configured lifetime").toBeLessThanOrEqual(
        issuedAt + tokenTtlSeconds + CLOCK_SKEW_SECONDS,
      );
      expect(exp as number, "not already expired").toBeGreaterThan(issuedAt);
    },
  );

  test("a foreign Origin is refused", { tag: ["@WR-4", "@value-critical"] }, async ({
    request,
    baseURL,
  }) => {
    await freshBucket();
    const origin = new URL(baseURL ?? "").origin;
    const foreignCreate = await createMeeting(request, { origin: FOREIGN_ORIGIN });
    expect(foreignCreate.status(), "create meeting from a foreign origin").toBe(
      STATUS.forbiddenOrigin,
    );

    const code = await issuedCode(request, { origin });
    const foreignToken = await requestToken(request, code, "Guest A", {
      origin: FOREIGN_ORIGIN,
    });
    expect(foreignToken.status(), "token from a foreign origin").toBe(STATUS.forbiddenOrigin);
    const body: unknown = await foreignToken.json();
    expect(isApiError(body, "forbidden-origin"), "error body matches the contract").toBe(true);
    expect(carriesToken(body), "no token in the refusal").toBe(false);
  });

  test(
    "an arbitrary client-chosen room is refused with 404",
    { tag: ["@WR-4", "@negative-control"] },
    async ({ request, baseURL }, testInfo) => {
      await freshBucket();
      const origin = new URL(baseURL ?? "").origin;
      const observed: Record<string, number> = {};
      for (const room of [unissuedCode(), "standup"]) {
        const response = await requestToken(request, room, "Guest A", { origin });
        observed[room] = response.status();
        const body: unknown = await response.json();
        expect(response.status(), `token for client-chosen room "${room}"`).toBe(
          STATUS.meetingNotFound,
        );
        expect(isApiError(body, "meeting-not-found"), "error body matches the contract").toBe(true);
        expect(carriesToken(body), "no token issued").toBe(false);
      }
      await attachJson(testInfo, "wr-4-client-chosen-rooms.json", observed);
    },
  );

  test(
    "a burst below the limit succeeds",
    { tag: ["@WR-4", "@negative-control"] },
    async ({ request, baseURL }, testInfo) => {
      const { burst } = abuseLimits();
      await freshBucket();
      const origin = new URL(baseURL ?? "").origin;
      // One request creates the meeting; the rest stay one under the burst.
      const code = await issuedCode(request, { origin });
      const statuses: number[] = [];
      for (let i = 0; i < burst - 2; i += 1) {
        statuses.push((await requestToken(request, code, `Guest ${i}`, { origin })).status());
      }
      await attachJson(testInfo, "wr-4-below-limit.json", { burst, sent: burst - 1, statuses });
      expect(
        statuses.every((s) => s === STATUS.ok),
        "every request below the limit succeeds",
      ).toBe(true);
    },
  );

  test(
    "requests above the per-client rate receive 429",
    { tag: ["@WR-4", "@value-critical"] },
    async ({ request, baseURL }, testInfo) => {
      const { burst, refillSeconds } = abuseLimits();
      test.setTimeout(3 * refillSeconds * 1000 + SLACK_MS);
      const origin = new URL(baseURL ?? "").origin;
      await sleep(refillSeconds * 1000);
      const code = await issuedCode(request, { origin });
      const statuses: number[] = [];
      // burst - 1 tokens fill the bucket (with the create above); the next three exceed it.
      for (let i = 0; i < burst + 2; i += 1) {
        statuses.push((await requestToken(request, code, `Guest ${i}`, { origin })).status());
      }
      await attachJson(testInfo, "wr-4-above-limit.json", { burst, statuses });
      const beyond = statuses.slice(burst - 1);
      expect(beyond.length, "requests sent beyond the burst").toBe(3);
      expect(
        beyond.every((s) => s === STATUS.rateLimited),
        "every request beyond the burst is 429",
      ).toBe(true);
      // Leave the bucket full for whatever runs next against the same address.
      await sleep(refillSeconds * 1000);
    },
  );
});
