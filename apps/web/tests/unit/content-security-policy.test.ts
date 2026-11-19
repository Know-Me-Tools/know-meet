// TJ-ARCH-MOB-001 compliant
// c13 security review L3: hardening directives in the shared and header policies.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  buildContentSecurityPolicy,
  buildContentSecurityPolicyHeader,
} from "../../scripts/content-security-policy.ts";

// The desktop policy at the base commit, byte for byte. A change to the default
// policy must be a deliberate, reviewed edit of this string.
const DESKTOP_CSP_GOLDEN =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; font-src 'self'; connect-src 'self' ipc: http://ipc.localhost; base-uri 'none'; form-action 'self'; object-src 'none'";

function directives(policy: string): Map<string, string> {
  return new Map(
    policy.split("; ").map((d) => {
      const [name = "", ...sources] = d.split(" ");
      return [name, sources.join(" ")];
    }),
  );
}

test("the meta/Tauri policy carries base-uri, form-action and object-src", () => {
  const policy = directives(buildContentSecurityPolicy({ livekitUrl: undefined }));
  assert.equal(policy.get("base-uri"), "'none'");
  assert.equal(policy.get("form-action"), "'self'");
  assert.equal(policy.get("object-src"), "'none'");
  assert.equal(policy.has("frame-ancestors"), false, "ignored in <meta>, so not in it");
  assert.equal(policy.get("connect-src"), "'self' ipc: http://ipc.localhost");
});

test("the header policy adds frame-ancestors 'none' to the shared policy", () => {
  const input = { livekitUrl: "wss://lk.example", mediaOrigins: "https://cdn.example" };
  const header = buildContentSecurityPolicyHeader(input);
  assert.ok(header.startsWith(`${buildContentSecurityPolicy(input)}; `));
  assert.equal(directives(header).get("frame-ancestors"), "'none'");
});

const HOSTED = { livekitUrl: "wss://lk.example", hosted: true } as const;

test("the hosted policy adds only the adopted web sources", () => {
  const hosted = directives(buildContentSecurityPolicy(HOSTED));
  assert.equal(hosted.get("script-src"), "'self' 'wasm-unsafe-eval'");
  assert.equal(hosted.get("worker-src"), "'self' blob:");
  assert.equal(hosted.get("media-src"), "'self' blob:");
  assert.equal(hosted.get("img-src"), "'self' data: blob:");
  assert.equal(hosted.get("connect-src"), "'self' wss://lk.example https://lk.example");
  assert.equal(hosted.get("default-src"), "'self'");
  assert.equal((hosted.get("script-src") ?? "").includes("'unsafe-eval'"), false);
});

test("media origins follow the hosted blob: sources", () => {
  const hosted = directives(
    buildContentSecurityPolicy({ ...HOSTED, mediaOrigins: "https://cdn.example" }),
  );
  assert.equal(hosted.get("img-src"), "'self' data: blob: https://cdn.example");
  assert.equal(hosted.get("media-src"), "'self' blob: https://cdn.example");
});

test("the header policy keeps the hosted sources and adds frame-ancestors", () => {
  const header = buildContentSecurityPolicyHeader(HOSTED);
  assert.ok(header.startsWith(`${buildContentSecurityPolicy(HOSTED)}; `));
  assert.ok(header.includes("worker-src 'self' blob:"));
  assert.equal(directives(header).get("frame-ancestors"), "'none'");
});

test("the default policy has no hosted-only source or directive", () => {
  for (const input of [
    { livekitUrl: undefined },
    { livekitUrl: "wss://lk.example", mediaOrigins: "https://cdn.example" },
  ]) {
    const policy = buildContentSecurityPolicy(input);
    assert.equal(policy.includes("blob:"), false, policy);
    assert.equal(policy.includes("wasm-unsafe-eval"), false, policy);
    assert.equal(directives(policy).has("worker-src"), false, policy);
  }
});

test("the desktop policy in tauri.conf.json is the default builder output, unchanged", () => {
  const confPath = new URL("../../../desktop/src-tauri/tauri.conf.json", import.meta.url);
  const conf = JSON.parse(readFileSync(confPath, "utf8")) as {
    readonly app: { readonly security: { readonly csp: string } };
  };
  assert.equal(conf.app.security.csp, buildContentSecurityPolicy({ livekitUrl: undefined }));
  assert.equal(conf.app.security.csp, DESKTOP_CSP_GOLDEN);
});
