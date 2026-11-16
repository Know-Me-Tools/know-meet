/**
 * Artifact scan (WR-6). Proves that no LiveKit credential and no access token is present
 * in tracked files, the hosted web bundle, the container images or the rendered
 * manifests. Contract: tests/release/scan-contract.md.
 *
 *   node tooling/release/src/scan-artifacts.ts \
 *     [--repo .] [--bundle apps/web/dist-hosted] [--image <ref>]... \
 *     [--manifests <file or directory>] [--json <report path>]
 *
 * Exit 0: every input was read and nothing was found. Exit 1: at least one finding.
 * Exit 2: the scan could not complete. A finding line names a class and a location only.
 */
import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { scanBundle, scanTracked } from "./scan/files.ts";
import { scanImage } from "./scan/image.ts";
import { scanManifests } from "./scan/manifests.ts";
import {
  loadSecretValues,
  makeClassifier,
  makeRedactor,
  type SecretValues,
} from "./scan/matchers.ts";
import { Collector, ScanError } from "./scan/model.ts";

/** The directory `pnpm --filter @know-meet/web run build:hosted` writes. */
const DEFAULT_BUNDLE = "apps/web/dist-hosted";
const DEFAULT_IMAGES: readonly string[] = ["know-meet-web:boundary", "know-meet-livekit:boundary"];

interface Options {
  readonly repo: string;
  readonly bundle: string;
  readonly images: readonly string[];
  readonly manifests: string | undefined;
  readonly json: string | undefined;
}

function readOptions(argv: readonly string[]): Options {
  try {
    const { values } = parseArgs({
      args: [...argv],
      allowPositionals: false,
      strict: true,
      options: {
        repo: { type: "string" },
        bundle: { type: "string" },
        image: { type: "string", multiple: true },
        manifests: { type: "string" },
        json: { type: "string" },
      },
    });
    const given = values.image ?? [];
    const images = given.length === 0 ? DEFAULT_IMAGES : given;
    return {
      repo: values.repo ?? ".",
      bundle: values.bundle ?? DEFAULT_BUNDLE,
      images,
      manifests: values.manifests,
      json: values.json,
    };
  } catch {
    throw new ScanError(
      "ERROR usage expected --repo, --bundle, --image (repeatable), --manifests and --json only",
    );
  }
}

function summaryLine(collector: Collector, secrets: SecretValues): string {
  return [
    "SUMMARY",
    `inputs=${collector.inputs}`,
    `files=${collector.files}`,
    `findings=${collector.findings.length}`,
    `short-values-skipped=${secrets.shortSkipped}`,
    `excluded=${secrets.excluded.join(",")}`,
  ].join(" ");
}

function writeReport(
  path: string,
  collector: Collector,
  secrets: SecretValues,
  error: string | null,
): void {
  const report = {
    completed: error === null,
    ...(error === null ? {} : { error }),
    findings: collector.findings,
    summary: {
      inputs: collector.inputs,
      files: collector.files,
      findings: collector.findings.length,
      shortValuesSkipped: secrets.shortSkipped,
      excluded: secrets.excluded,
    },
  };
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function runInputs(
  options: Options,
  collector: Collector,
  secrets: SecretValues,
): Promise<void> {
  const classify = makeClassifier(secrets);
  await scanTracked(options.repo, collector, classify);
  await scanBundle(options.bundle, collector, classify);
  for (const ref of options.images) await scanImage(ref, collector, classify);
  await scanManifests(options.manifests, options.repo, collector, classify);
}

function describeFailure(error: unknown): ScanError {
  if (error instanceof ScanError) return error;
  // Only the error class: the message of a failed read or parse can contain input bytes.
  const name = error instanceof Error ? error.name : "unknown";
  return new ScanError(`ERROR scan-failed unexpected ${name}`);
}

async function main(argv: readonly string[]): Promise<number> {
  let options: Options;
  let secrets: SecretValues;
  try {
    options = readOptions(argv);
    secrets = loadSecretValues(process.env);
  } catch (error) {
    process.stderr.write(`${describeFailure(error).line}\n`);
    return 2;
  }
  const collector = new Collector(makeRedactor(secrets));
  let failure: ScanError | null = null;
  try {
    await runInputs(options, collector, secrets);
  } catch (error) {
    failure = describeFailure(error);
  }
  for (const finding of collector.findings) {
    process.stdout.write(`FINDING ${finding.class} ${finding.location}\n`);
  }
  if (failure === null) process.stdout.write(`${summaryLine(collector, secrets)}\n`);
  else process.stderr.write(`${failure.line}\n`);
  if (options.json !== undefined) {
    try {
      writeReport(options.json, collector, secrets, failure?.line ?? null);
    } catch {
      process.stderr.write("ERROR report-write-failed the --json report could not be written\n");
      return 2;
    }
  }
  if (failure !== null) return 2;
  return collector.findings.length > 0 ? 1 : 0;
}

process.exitCode = await main(process.argv.slice(2));
