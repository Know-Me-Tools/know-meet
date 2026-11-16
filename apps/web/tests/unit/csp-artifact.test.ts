// TJ-ARCH-MOB-001 compliant
// wr06 6.3: the CSP header artifact is exactly buildContentSecurityPolicyHeader's value,
// so the response header the Gateway sets cannot drift from the meta tag.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { BUILD_MODE_ENV, resolveBuildInputs } from "../../scripts/build-mode.ts";
import {
  buildContentSecurityPolicy,
  buildContentSecurityPolicyHeader,
  LIVEKIT_URL_ENV,
  MEDIA_ORIGINS_ENV,
} from "../../scripts/content-security-policy.ts";
import {
  CSP_ARTIFACT_FILE,
  hostedContentSecurityPolicyHeader,
  removeCspArtifact,
  writeCspArtifact,
} from "../../scripts/csp-artifact.ts";

const HOSTED_ENV = { [BUILD_MODE_ENV]: "hosted", [LIVEKIT_URL_ENV]: "wss://lk.example" };

function withTempDir(run: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "km-csp-artifact-"));
  try {
    run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("the hosted header is the existing builder's value for the same inputs", () => {
  const inputs = resolveBuildInputs({ ...HOSTED_ENV, [MEDIA_ORIGINS_ENV]: "https://cdn.example" });
  const header = hostedContentSecurityPolicyHeader(inputs);
  assert.equal(
    header,
    buildContentSecurityPolicyHeader({
      livekitUrl: "wss://lk.example",
      mediaOrigins: "https://cdn.example",
      hosted: true,
    }),
  );
});

test("the header allows the LiveKit signalling origin, adds frame-ancestors, and extends the meta policy", () => {
  const inputs = resolveBuildInputs(HOSTED_ENV);
  const header = hostedContentSecurityPolicyHeader(inputs);
  const connect = header.split("; ").find((d) => d.startsWith("connect-src "));
  assert.ok(connect?.includes("wss://lk.example"), "connect-src has the wss origin");
  assert.ok(header.endsWith("; frame-ancestors 'none'"));
  const meta = buildContentSecurityPolicy({ livekitUrl: "wss://lk.example", hosted: true });
  assert.ok(header.startsWith(`${meta}; `), "the meta policy is the header minus header-only part");
});

test("the artifact holds the value exactly, with no trailing newline", () => {
  withTempDir((dir) => {
    const path = join(dir, "nested", CSP_ARTIFACT_FILE);
    const header = hostedContentSecurityPolicyHeader(resolveBuildInputs(HOSTED_ENV));
    writeCspArtifact(path, header);
    assert.equal(readFileSync(path, "utf8"), header);
  });
});

test("a rewrite replaces the previous value and removal deletes the file", () => {
  withTempDir((dir) => {
    const path = join(dir, CSP_ARTIFACT_FILE);
    writeCspArtifact(path, "default-src 'self'");
    writeCspArtifact(path, "default-src 'none'");
    assert.equal(readFileSync(path, "utf8"), "default-src 'none'");
    removeCspArtifact(path);
    assert.equal(existsSync(path), false);
    removeCspArtifact(path);
  });
});

test("an empty or multi-line value is refused and nothing is written", () => {
  withTempDir((dir) => {
    const path = join(dir, CSP_ARTIFACT_FILE);
    assert.throws(() => writeCspArtifact(path, "  "), /empty/);
    assert.throws(() => writeCspArtifact(path, "a; b\nc"), /single line/);
    assert.equal(existsSync(path), false);
  });
});

test("hosted connect-src omits the Tauri IPC origins and the default build keeps them", () => {
  const connectOf = (policy: string): string[] =>
    (policy.split("; ").find((d) => d.startsWith("connect-src ")) ?? "").split(" ").slice(1);
  const hosted = connectOf(hostedContentSecurityPolicyHeader(resolveBuildInputs(HOSTED_ENV)));
  assert.deepEqual(hosted, ["'self'", "wss://lk.example", "https://lk.example"]);
  const desktop = connectOf(buildContentSecurityPolicy({ livekitUrl: undefined }));
  assert.deepEqual(desktop, ["'self'", "ipc:", "http://ipc.localhost"]);
});
