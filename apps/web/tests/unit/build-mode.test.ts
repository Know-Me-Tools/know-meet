// TJ-ARCH-MOB-001 compliant
// wr06 6.1 / 6.3: the build-mode switch. The default build is unchanged; the hosted
// build needs the public LiveKit URL and moves to its own output directory.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BUILD_MODE_ENV,
  buildDefines,
  HOSTED_DEFINE,
  HOSTED_OUT_DIR,
  outDirOverride,
  parseBuildMode,
  resolveBuildInputs,
} from "../../scripts/build-mode.ts";
import { LIVEKIT_URL_ENV, MEDIA_ORIGINS_ENV } from "../../scripts/content-security-policy.ts";

test("an unset or empty mode is the default build", () => {
  assert.equal(parseBuildMode(undefined), "default");
  assert.equal(parseBuildMode(""), "default");
  assert.equal(parseBuildMode("  "), "default");
});

test("hosted is the only other mode, and anything else fails loudly", () => {
  assert.equal(parseBuildMode("hosted"), "hosted");
  assert.throws(() => parseBuildMode("Hosted"), /KM_BUILD_MODE must be "hosted" or unset/);
  assert.throws(() => parseBuildMode("production"), /got "production"/);
});

test("the default build defines the flag false, keeps dist and needs no LiveKit URL", () => {
  const inputs = resolveBuildInputs({});
  assert.equal(inputs.mode, "default");
  assert.equal(inputs.hosted, false);
  assert.equal(inputs.livekitUrl, undefined);
  assert.deepEqual(buildDefines(inputs), { [HOSTED_DEFINE]: "false" });
  assert.deepEqual(outDirOverride(inputs), {});
});

test("the default build passes the LiveKit and media inputs through untouched", () => {
  const inputs = resolveBuildInputs({
    [LIVEKIT_URL_ENV]: "wss://lk.example",
    [MEDIA_ORIGINS_ENV]: "https://cdn.example",
  });
  assert.equal(inputs.livekitUrl, "wss://lk.example");
  assert.equal(inputs.mediaOrigins, "https://cdn.example");
});

test("the hosted build defines the flag true and writes to its own directory", () => {
  const inputs = resolveBuildInputs({
    [BUILD_MODE_ENV]: "hosted",
    [LIVEKIT_URL_ENV]: "wss://lk.example",
  });
  assert.equal(inputs.mode, "hosted");
  assert.equal(inputs.hosted, true);
  assert.deepEqual(buildDefines(inputs), { [HOSTED_DEFINE]: "true" });
  assert.deepEqual(outDirOverride(inputs), { outDir: HOSTED_OUT_DIR });
});

test("the hosted build without the LiveKit URL fails and names the input", () => {
  for (const missing of [undefined, "", "   "]) {
    assert.throws(
      () => resolveBuildInputs({ [BUILD_MODE_ENV]: "hosted", [LIVEKIT_URL_ENV]: missing }),
      (error: unknown) =>
        error instanceof Error &&
        error.message.includes(LIVEKIT_URL_ENV) &&
        error.message.includes("not a secret"),
    );
  }
});

test("the hosted build rejects a LiveKit URL that is not a bare wss origin", () => {
  for (const bad of ["https://lk.example", "wss://user:pass@lk.example", "wss://lk.example/?a=b"]) {
    assert.throws(
      () => resolveBuildInputs({ [BUILD_MODE_ENV]: "hosted", [LIVEKIT_URL_ENV]: bad }),
      new RegExp(LIVEKIT_URL_ENV),
    );
  }
});

test("only the hosted boolean enters the bundle: no LiveKit credential name is read or defined", () => {
  const inputs = resolveBuildInputs({
    [BUILD_MODE_ENV]: "hosted",
    [LIVEKIT_URL_ENV]: "wss://lk.example",
    LIVEKIT_API_KEY: "key-must-not-appear",
    LIVEKIT_API_SECRET: "secret-must-not-appear",
  });
  const serialised = JSON.stringify({ inputs, defines: buildDefines(inputs) });
  assert.equal(serialised.includes("must-not-appear"), false);
  assert.deepEqual(Object.keys(buildDefines(inputs)), [HOSTED_DEFINE]);
});
