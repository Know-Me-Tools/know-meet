/**
 * Builds the Tauri spike shell (../../tauri-shell) around O's current dist for gate 16.1/16.5,
 * without touching tauri-shell/bin or its generated configs:
 *   node gates/scripts/build-gate-shell.ts   ->  gates/bin/km-spike-own-gate (.exe on Windows)
 * Same CSP as tauri-shell/scripts/build-shell.ts (apps/web policy + connect-src :4317, no media origin).
 * Run with RUSTC_WRAPPER= on this machine (global sccache wrapper hangs).
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildContentSecurityPolicy } from "../../../../../apps/web/scripts/content-security-policy.ts";

const HARNESS_ORIGIN = "http://127.0.0.1:4317";
const OWN = resolve(import.meta.dirname, "..", "..");
const SRC_TAURI = resolve(OWN, "..", "tauri-shell", "src-tauri");
const GATES = join(OWN, "gates");

export function gateCsp(): string {
  return buildContentSecurityPolicy({ livekitUrl: undefined })
    .split("; ")
    .map((d) => (d.startsWith("connect-src ") ? `${d} ${HARNESS_ORIGIN}` : d))
    .join("; ");
}

function main(): void {
  const dist = join(OWN, "dist");
  if (!existsSync(join(dist, "index.html"))) throw new Error(`${dist}/index.html missing: run pnpm build first`);
  mkdirSync(join(GATES, "bin"), { recursive: true });
  const configPath = join(GATES, "bin", "tauri.own-gate.generated.json");
  const config = { build: { frontendDist: dist }, app: { security: { csp: gateCsp() } } };
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  process.stdout.write(`csp: ${config.app.security.csp}\n`);
  const result = spawnSync("cargo", ["tauri", "build", "--no-bundle", "--config", configPath], { cwd: SRC_TAURI, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`cargo tauri build exited ${result.status ?? "by signal"}`);
  const exe = process.platform === "win32" ? ".exe" : "";
  const out = join(GATES, "bin", `km-spike-own-gate${exe}`);
  copyFileSync(join(SRC_TAURI, "target", "release", `km-agentic-ui-tauri-shell${exe}`), out);
  process.stdout.write(`built ${out}\n`);
}

main();
