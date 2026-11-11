/**
 * Gate 16.4: builds the spike shell around a prototype's current dist with the harness origin on a
 * chosen port, so the accessibility run can use a second harness instance while gate 16.3 keeps :4317.
 *   RUSTC_WRAPPER= node scripts/build-a11y-shell.ts <own|hybrid> <port>  ->  bin/km-spike-<prototype>-a11y-<port>
 * CSP: apps/web's policy plus connect-src http://127.0.0.1:<port> (no media origin), i.e. the same
 * policy as own/gates/scripts/build-gate-shell.ts with only the port changed. For `own` the embedded
 * dist is the gate-16.1 build (bounded publish scheduler).
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildContentSecurityPolicy } from "../../../../apps/web/scripts/content-security-policy.ts";

const SHELL = resolve(import.meta.dirname, "..");
const SRC_TAURI = join(SHELL, "src-tauri");

function a11yCsp(origin: string): string {
  return buildContentSecurityPolicy({ livekitUrl: undefined })
    .split("; ")
    .map((d) => (d.startsWith("connect-src ") ? `${d} ${origin}` : d))
    .join("; ");
}

function main(): void {
  const prototype = process.argv[2];
  const port = Number(process.argv[3]);
  if ((prototype !== "own" && prototype !== "hybrid") || !Number.isInteger(port) || port < 1024 || port > 65_535) {
    throw new Error("usage: node scripts/build-a11y-shell.ts <own|hybrid> <port>");
  }
  const dist = resolve(SHELL, "..", prototype, "dist");
  if (!existsSync(join(dist, "index.html"))) throw new Error(`${dist}/index.html missing: run pnpm build in ../${prototype}`);
  const configPath = join(SRC_TAURI, `tauri.${prototype}-a11y.generated.json`);
  const config = { build: { frontendDist: dist }, app: { security: { csp: a11yCsp(`http://127.0.0.1:${port}`) } } };
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  process.stdout.write(`csp: ${config.app.security.csp}\n`);
  const result = spawnSync("cargo", ["tauri", "build", "--no-bundle", "--config", configPath], { cwd: SRC_TAURI, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`cargo tauri build exited ${result.status ?? "by signal"}`);
  mkdirSync(join(SHELL, "bin"), { recursive: true });
  const out = join(SHELL, "bin", `km-spike-${prototype}-a11y-${port}`);
  copyFileSync(join(SRC_TAURI, "target", "release", "km-agentic-ui-tauri-shell"), out);
  process.stdout.write(`built ${out}\n`);
}

main();
