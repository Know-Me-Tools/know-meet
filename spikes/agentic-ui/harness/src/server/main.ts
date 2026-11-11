/**
 * Entry point: `pnpm serve` (node src/server/main.ts).
 * Port from KM_HARNESS_PORT (default 4317); evil listener on KM_HARNESS_EVIL_PORT (default port + 1).
 */
import { startHarnessServer } from "./app.ts";
import { readConfig } from "./config.ts";

async function main(): Promise<void> {
  const harness = await startHarnessServer(readConfig());
  const counts = harness.corpus.counts();
  process.stdout.write(
    `km harness listening on ${harness.origins.allowed} (evil listener ${harness.origins.evil})\n` +
      `corpus: ${counts["ag-ui"]} AG-UI scenarios, ${counts.a2ui} A2UI surfaces, ${counts.hostile} hostile items\n`,
  );
  const shutdown = (): void => {
    harness.close().then(
      () => process.exit(0),
      () => process.exit(1),
    );
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
  process.stderr.write(`km harness failed to start: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
