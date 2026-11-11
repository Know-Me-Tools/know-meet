/**
 * Builds the spike shell for one prototype:
 *   node scripts/build-shell.ts <hybrid|own>
 * 1. Writes src-tauri/tauri.<prototype>.generated.json: frontendDist = ../../<prototype>/dist and
 *    app.security.csp = apps/web's policy (apps/web/scripts/content-security-policy.ts, no LiveKit URL)
 *    plus connect-src http://127.0.0.1:4317 (the harness mock server and collector).
 * 2. Runs the pinned CLI: `cargo tauri build --no-bundle --config <generated>` (release, custom-protocol,
 *    assets embedded as in a shipped app).
 * 3. Copies the binary to bin/km-spike-<prototype>.
 * Variant: `node scripts/build-shell.ts <prototype> media` also allows the harness origin in img-src and
 * media-src (bin/km-spike-<prototype>-media), to separate CSP blocking from prototype behaviour.
 * The prototype's dist must already be built (`pnpm build` in its folder).
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildContentSecurityPolicy } from "../../../../apps/web/scripts/content-security-policy.ts";

const HARNESS_ORIGIN = "http://127.0.0.1:4317";
const SHELL = resolve(import.meta.dirname, "..");
const SRC_TAURI = join(SHELL, "src-tauri");

export function spikeCsp(allowMedia: boolean): string {
  const base = buildContentSecurityPolicy({ livekitUrl: undefined });
  const parts = base.split("; ").map((d) => (d.startsWith("connect-src ") || (allowMedia && d.startsWith("img-src ")) ? `${d} ${HARNESS_ORIGIN}` : d));
  return [...parts, ...(allowMedia ? [`media-src 'self' ${HARNESS_ORIGIN}`] : [])].join("; ");
}

function main(): void {
  const prototype = process.argv[2];
  const allowMedia = process.argv[3] === "media";
  if (prototype !== "hybrid" && prototype !== "own") throw new Error("usage: node scripts/build-shell.ts <hybrid|own>");
  const dist = resolve(SHELL, "..", prototype, "dist");
  if (!existsSync(join(dist, "index.html"))) throw new Error(`${dist}/index.html missing: run pnpm build in ../${prototype}`);
  const configPath = join(SRC_TAURI, `tauri.${prototype}.generated.json`);
  const config = { build: { frontendDist: `../../${prototype}/dist` }, app: { security: { csp: spikeCsp(allowMedia) } } };
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  process.stdout.write(`csp: ${config.app.security.csp}\n`);
  const result = spawnSync("cargo", ["tauri", "build", "--no-bundle", "--config", configPath], { cwd: SRC_TAURI, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`cargo tauri build exited ${result.status ?? "by signal"}`);
  mkdirSync(join(SHELL, "bin"), { recursive: true });
  const out = join(SHELL, "bin", `km-spike-${prototype}${allowMedia ? "-media" : ""}`);
  copyFileSync(join(SRC_TAURI, "target", "release", "km-agentic-ui-tauri-shell"), out);
  process.stdout.write(`built ${out}\n`);
}

main();
