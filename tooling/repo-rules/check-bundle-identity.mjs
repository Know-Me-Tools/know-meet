// Root entry for the VS-2 bundle-identity check (c03 request). The checker
// lives with the fidelity suite and only runs when it is the process entry
// point, so this shim forwards argv and the exit code to a child process.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const checker = fileURLToPath(
  new URL("../../tests/fidelity/src/bundle-identity/check-bundle-identity.ts", import.meta.url),
);
const result = spawnSync(process.execPath, [checker, ...process.argv.slice(2)], {
  stdio: "inherit",
});
if (result.error !== undefined) {
  process.stderr.write(`check-bundle-identity shim: ${result.error.message}\n`);
  process.exit(2);
}
process.exit(result.status ?? 2);
