// TJ-ARCH-MOB-001 compliant
// wr04 4.2: the HTTP TokenIssuer against a stub fetch. Nothing here touches a network.
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseDisplayName, parseRoomCode } from "@know-meet/domain";
import { createHttpTokenIssuer } from "../../src/infrastructure/meeting/http-token-issuer.ts";

const CODE = parseRoomCode("km-4fq-82x");
const NAME = parseDisplayName("Ada");
if (CODE === null || NAME === null) throw new Error("fixture values must parse");
const REQUEST = { code: CODE, displayName: NAME };

const GOOD_TOKEN = {
  ok: true,
  data: {
    url: "wss://media.example",
    token: "jwt-value",
    identity: "guest-1",
    room: "km-4fq-82x",
    expiresIn: 600,
  },
};

interface Call {
  readonly url: string;
  readonly init: RequestInit | undefined;
}

function stub(respond: () => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fetchStub: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return respond();
  };
  return { calls, issuer: createHttpTokenIssuer({ fetch: fetchStub }) };
}

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

test("createMeeting posts an empty JSON body and returns the parsed code", async () => {
  const { calls, issuer } = stub(() => json(201, { ok: true, data: { code: "km-4fq-82x" } }));
  const result = await issuer.createMeeting();
  assert.deepEqual(result, { ok: true, value: CODE });
  assert.equal(calls[0]?.url, "/api/meetings");
  assert.equal(calls[0]?.init?.method, "POST");
  assert.equal(calls[0]?.init?.body, "{}");
  assert.deepEqual(calls[0]?.init?.headers, { "Content-Type": "application/json" });
});

test("requestToken posts code and name and returns domain credentials", async () => {
  const { calls, issuer } = stub(() => json(200, GOOD_TOKEN));
  const result = await issuer.requestToken(REQUEST);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.url, "wss://media.example");
  assert.equal(result.value.token, "jwt-value");
  assert.equal(result.value.identity, "guest-1");
  assert.equal(result.value.room, CODE);
  assert.equal(result.value.expiresIn, 600);
  assert.equal(calls[0]?.url, "/api/token");
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), { code: "km-4fq-82x", name: "Ada" });
});

test("requestToken maps each documented status", async () => {
  const cases: ReadonlyArray<readonly [number, object]> = [
    [404, { code: "meeting-not-found" }],
    [403, { code: "forbidden" }],
    [400, { code: "invalid-request" }],
    [408, { code: "connection-lost" }],
    [500, { code: "connection-lost" }],
    [503, { code: "connection-lost" }],
    [418, { code: "connection-lost" }],
  ];
  for (const [status, expected] of cases) {
    const { issuer } = stub(() => json(status, { ok: false, error: { code: "x", message: "" } }));
    assert.deepEqual(
      await issuer.requestToken(REQUEST),
      { ok: false, error: expected },
      `${status}`,
    );
  }
});

test("429 carries Retry-After seconds, or null when absent or not a number", async () => {
  const withHeader = stub(() => json(429, { ok: false }, { "Retry-After": "7" }));
  assert.deepEqual(await withHeader.issuer.requestToken(REQUEST), {
    ok: false,
    error: { code: "rate-limited", retryAfterSeconds: 7 },
  });
  const missing = stub(() => json(429, { ok: false }));
  assert.deepEqual(await missing.issuer.createMeeting(), {
    ok: false,
    error: { code: "rate-limited", retryAfterSeconds: null },
  });
  const date = stub(() =>
    json(429, { ok: false }, { "Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT" }),
  );
  assert.deepEqual(await date.issuer.createMeeting(), {
    ok: false,
    error: { code: "rate-limited", retryAfterSeconds: null },
  });
});

test("createMeeting maps 403 and treats 404, 400 and 5xx as connection-lost", async () => {
  const forbidden = stub(() => json(403, { ok: false }));
  assert.deepEqual(await forbidden.issuer.createMeeting(), {
    ok: false,
    error: { code: "forbidden" },
  });
  for (const status of [400, 404, 408, 500, 503]) {
    const { issuer } = stub(() => json(status, { ok: false }));
    assert.deepEqual(await issuer.createMeeting(), {
      ok: false,
      error: { code: "connection-lost" },
    });
  }
});

test("a network failure is connection-lost for both calls", async () => {
  const failing = createHttpTokenIssuer({
    fetch: async () => {
      throw new TypeError("Failed to fetch");
    },
  });
  const lost = { ok: false, error: { code: "connection-lost" } };
  assert.deepEqual(await failing.createMeeting(), lost);
  assert.deepEqual(await failing.requestToken(REQUEST), lost);
});

test("malformed or off-contract bodies are connection-lost, never a value", async () => {
  const badCodes = [
    { ok: true, data: { code: "not-a-code" } },
    { ok: true, data: {} },
    { ok: false, data: { code: "km-4fq-82x" } },
    [],
  ];
  for (const body of badCodes) {
    const { issuer } = stub(() => json(201, body));
    assert.equal((await issuer.createMeeting()).ok, false);
  }
  const data = GOOD_TOKEN.data;
  const badTokens = [
    { ok: true, data: { ...data, room: "km-zzz-zzz" } },
    { ok: true, data: { ...data, room: "bad" } },
    { ok: true, data: { ...data, url: "https://media.example" } },
    { ok: true, data: { ...data, url: "not a url" } },
    { ok: true, data: { ...data, token: "" } },
    { ok: true, data: { ...data, identity: 5 } },
    { ok: true, data: { ...data, expiresIn: 0 } },
    { ok: true, data: { ...data, expiresIn: "600" } },
    { ok: true },
    null,
  ];
  for (const body of badTokens) {
    const { issuer } = stub(() => json(200, body));
    assert.deepEqual(await issuer.requestToken(REQUEST), {
      ok: false,
      error: { code: "connection-lost" },
    });
  }
});

test("a body that is not JSON is connection-lost", async () => {
  const { issuer } = stub(() => new Response("<html>", { status: 200 }));
  assert.deepEqual(await issuer.requestToken(REQUEST), {
    ok: false,
    error: { code: "connection-lost" },
  });
});

test("a success status other than the contract's is connection-lost", async () => {
  const create = stub(() => json(200, { ok: true, data: { code: "km-4fq-82x" } }));
  assert.equal((await create.issuer.createMeeting()).ok, false);
  const token = stub(() => json(201, GOOD_TOKEN));
  assert.equal((await token.issuer.requestToken(REQUEST)).ok, false);
});

test("the abort signal reaches fetch, and an abort resolves to connection-lost", async () => {
  const controller = new AbortController();
  const seen: Array<AbortSignal | null | undefined> = [];
  const issuer = createHttpTokenIssuer({
    fetch: async (_input, init) => {
      seen.push(init?.signal);
      if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
      return json(200, GOOD_TOKEN);
    },
  });
  controller.abort();
  const result = await issuer.requestToken(REQUEST, controller.signal);
  assert.equal(seen[0], controller.signal);
  assert.deepEqual(result, { ok: false, error: { code: "connection-lost" } });
});
