// TJ-ARCH-MOB-001 compliant
// `pnpm --filter @know-meet/web run build:hosted`: the web bundle alone, in hosted
// mode, into dist-hosted/, plus the CSP response-header value in dist-hosted-csp.txt.
// No Tauri or Flutter build runs here. Required input: KM_LIVEKIT_URL (public wss://
// LiveKit URL, not a secret). Optional: KM_MEDIA_ORIGINS.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { BUILD_MODE_ENV, resolveBuildInputs } from "./build-mode.ts";
import {
  CSP_ARTIFACT_FILE,
  hostedContentSecurityPolicyHeader,
  removeCspArtifact,
  writeCspArtifact,
} from "./csp-artifact.ts";

const appRoot = fileURLToPath(new URL("../", import.meta.url));
const artifactPath = fileURLToPath(new URL(`../${CSP_ARTIFACT_FILE}`, import.meta.url));

process.env[BUILD_MODE_ENV] = "hosted";

let header: string;
try {
  header = hostedContentSecurityPolicyHeader(resolveBuildInputs(process.env));
} catch (error) {
  console.error(`build:hosted failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

// A failed build must not leave an older header value behind for the tests to read.
removeCspArtifact(artifactPath);

const typecheck = spawnSync(process.execPath, ["node_modules/typescript/bin/tsc", "--noEmit"], {
  cwd: appRoot,
  stdio: "inherit",
  shell: false,
});
if (typecheck.error) throw typecheck.error;
if (typecheck.status !== 0) process.exit(typecheck.status ?? 1);

await build({ root: appRoot });
writeCspArtifact(artifactPath, header);
console.log(`build:hosted wrote ${CSP_ARTIFACT_FILE}: ${header}`);
