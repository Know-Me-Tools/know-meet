// TJ-ARCH-MOB-001 compliant
// c13 security review L3: hardening directives in the shared and header policies.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildContentSecurityPolicy,
  buildContentSecurityPolicyHeader,
} from "../../scripts/content-security-policy.ts";

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
