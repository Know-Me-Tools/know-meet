// TJ-ARCH-MOB-001 compliant
// Runs the Tauri CLI with the same Content-Security-Policy the web build embeds,
// so the env-driven LiveKit origin (KM_LIVEKIT_URL, KM_MEDIA_ORIGINS) reach both from one source.
// Usage: pnpm --filter @know-meet/desktop tauri <command> [args…]
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import {
  buildContentSecurityPolicy,
  LIVEKIT_URL_ENV,
  MEDIA_ORIGINS_ENV,
} from "../../web/scripts/content-security-policy.ts";

/** Tauri CLI commands that accept `--config` (JSON Merge Patch over tauri.conf.json). */
const CONFIGURABLE_COMMANDS = new Set(["dev", "build", "bundle"]);

const [command, ...rest] = process.argv.slice(2);
const csp = buildContentSecurityPolicy({
  livekitUrl: process.env[LIVEKIT_URL_ENV],
  mediaOrigins: process.env[MEDIA_ORIGINS_ENV],
});
const args =
  command !== undefined && CONFIGURABLE_COMMANDS.has(command)
    ? [command, "--config", JSON.stringify({ app: { security: { csp } } }), ...rest]
    : process.argv.slice(2);

/**
 * Resolves the `@tauri-apps/cli` JS entry from its package.json `bin` field. Spawning it with
 * `process.execPath` avoids the `tauri` / `tauri.cmd` shim, which Node cannot start without a
 * shell on Windows.
 */
function resolveTauriCliEntry(): string {
  const packageJsonPath = createRequire(import.meta.url).resolve("@tauri-apps/cli/package.json");
  const manifest = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    readonly bin?: string | Readonly<Record<string, string>>;
  };
  const bin = typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.["tauri"];
  if (bin === undefined) throw new Error("@tauri-apps/cli package.json declares no `tauri` bin");
  return join(dirname(packageJsonPath), bin);
}

const result = spawnSync(process.execPath, [resolveTauriCliEntry(), ...args], {
  stdio: "inherit",
  shell: false,
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
