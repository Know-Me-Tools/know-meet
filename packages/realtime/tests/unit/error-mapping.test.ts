// wr04 task 4.1: SDK and browser failures become the port's typed errors.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  errorName,
  isTokenRejection,
  mapConnectError,
  mapMediaError,
} from "../../src/realtime-room/domain/error-mapping.ts";

/** Stand-in for the SDK's `ConnectionErrorReason.NotAllowed`; the real value is passed in. */
const NOT_ALLOWED = 0;
const SERVER_UNREACHABLE = 1;

function connectionError(reason: number, status?: number) {
  return Object.assign(new Error("refused"), { name: "ConnectionError", reason, status });
}

function domException(name: string) {
  return Object.assign(new Error("device"), { name });
}

describe("connect error mapping", () => {
  it("maps a refused or expired token to forbidden", () => {
    const error = connectionError(NOT_ALLOWED, 401);
    assert.equal(isTokenRejection(error, NOT_ALLOWED), true);
    assert.deepEqual(mapConnectError(error, NOT_ALLOWED), { code: "forbidden" });
  });

  it("maps an unreachable server, a plain error and a non-error to connection-lost", () => {
    for (const error of [connectionError(SERVER_UNREACHABLE), new Error("boom"), "boom", null]) {
      assert.deepEqual(mapConnectError(error, NOT_ALLOWED), { code: "connection-lost" });
    }
  });

  it("does not treat another error type carrying the same reason as a token refusal", () => {
    const lookalike = Object.assign(new Error("x"), { name: "TypeError", reason: NOT_ALLOWED });
    assert.equal(isTokenRejection(lookalike, NOT_ALLOWED), false);
  });
});

describe("media error mapping", () => {
  it("maps a refused or unavailable device to permission-denied for that device", () => {
    for (const name of ["NotAllowedError", "NotFoundError", "NotReadableError"]) {
      assert.deepEqual(mapMediaError(domException(name), "camera"), {
        code: "permission-denied",
        device: "camera",
      });
    }
  });

  it("maps a publish failure to connection-lost", () => {
    assert.deepEqual(mapMediaError(domException("PublishTrackError"), "microphone"), {
      code: "connection-lost",
    });
  });
});

describe("error names", () => {
  it("reads the name and never the message", () => {
    assert.equal(errorName(domException("NotAllowedError")), "NotAllowedError");
    assert.equal(errorName({ message: "token=secret" }), "unknown");
    assert.equal(errorName(undefined), "unknown");
  });
});
