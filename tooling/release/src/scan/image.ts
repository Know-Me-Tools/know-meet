import { execFile, spawn } from "node:child_process";
import { gunzipSync } from "node:zlib";

import { type Classify, type Collector, ScanError } from "./model.ts";
import {
  isTar,
  MAX_ENTRY_BYTES,
  readTarBuffer,
  readTarStream,
  type TarEntry,
} from "./tar-reader.ts";

const INSPECT_MAX_BUFFER = 64 * 1024 * 1024;

interface InspectConfig {
  readonly Env?: unknown;
  readonly Labels?: unknown;
  readonly Cmd?: unknown;
  readonly Entrypoint?: unknown;
}

function dockerError(ref: string, code: unknown, step: string): ScanError {
  if (code === "ENOENT") {
    return new ScanError("ERROR docker-not-found the docker CLI is not on PATH");
  }
  return new ScanError(`ERROR image-${step}-failed image:${ref}`);
}

function inspect(ref: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "docker",
      ["image", "inspect", ref],
      { encoding: "utf8", maxBuffer: INSPECT_MAX_BUFFER },
      (error, stdout) => {
        if (error !== null) {
          reject(dockerError(ref, (error as NodeJS.ErrnoException).code, "inspect"));
          return;
        }
        resolve(stdout);
      },
    );
  });
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function configOf(parsed: unknown): InspectConfig {
  const first: unknown = Array.isArray(parsed) ? parsed[0] : undefined;
  if (typeof first !== "object" || first === null || !("Config" in first)) return {};
  const config: unknown = first.Config;
  return typeof config === "object" && config !== null ? (config as InspectConfig) : {};
}

/** The four inspect fields as text, one entry per line. Labels are `key=value`. */
function inspectFields(raw: string, ref: string): ReadonlyArray<readonly [string, string]> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ScanError(`ERROR image-inspect-unreadable image:${ref}`);
  }
  const config = configOf(parsed);
  const labels =
    typeof config.Labels === "object" && config.Labels !== null
      ? Object.entries(config.Labels).map(([key, value]) => `${key}=${String(value)}`)
      : [];
  return [
    ["Config.Env", asStringList(config.Env).join("\n")],
    ["Config.Labels", labels.join("\n")],
    ["Config.Cmd", JSON.stringify(config.Cmd ?? null)],
    ["Config.Entrypoint", JSON.stringify(config.Entrypoint ?? null)],
  ];
}

/** A 12-character digest prefix from the entry path, or a sanitised basename. */
function layerId(name: string): string {
  const digest = /[0-9a-f]{64}/.exec(name);
  if (digest !== null) return digest[0].slice(0, 12);
  const base = name.split("/").filter((part) => part !== "").pop() ?? "unnamed";
  return base.slice(0, 40);
}

function gunzipEntry(data: Buffer, ref: string, id: string): Buffer {
  if (data[0] !== 0x1f || data[1] !== 0x8b) return data;
  try {
    return gunzipSync(data, { maxOutputLength: MAX_ENTRY_BYTES });
  } catch {
    throw new ScanError(`ERROR layer-unreadable image:${ref} layer:${id}`);
  }
}

function scanOuterEntry(
  entry: TarEntry,
  ref: string,
  collector: Collector,
  classify: Classify,
): void {
  const id = layerId(entry.name);
  const data = gunzipEntry(entry.data, ref, id);
  if (!isTar(data)) {
    collector.check(data, `image:${ref} blob:${entry.name}`, classify);
    return;
  }
  let inner: TarEntry[];
  try {
    inner = readTarBuffer(data);
  } catch {
    throw new ScanError(`ERROR layer-unreadable image:${ref} layer:${id}`);
  }
  for (const file of inner) {
    collector.check(file.data, `image:${ref} layer:${id}/${file.name}`, classify);
  }
}

/** Runs `docker image save` and scans every entry; resolves with the exit code. */
async function scanSave(ref: string, collector: Collector, classify: Classify): Promise<void> {
  const child = spawn("docker", ["image", "save", ref], { stdio: ["ignore", "pipe", "pipe"] });
  child.stderr.resume();
  const closed = new Promise<number | null>((resolve, reject) => {
    child.on("error", (error: NodeJS.ErrnoException) => {
      reject(dockerError(ref, error.code, "save"));
    });
    child.on("close", (code) => resolve(code));
  });
  // A rejection while the stream is being read must not become an unhandled rejection.
  closed.catch(() => undefined);
  try {
    for await (const entry of readTarStream(child.stdout)) {
      scanOuterEntry(entry, ref, collector, classify);
    }
  } catch (error) {
    child.kill();
    if (error instanceof ScanError) throw error;
    throw new ScanError(`ERROR image-unreadable image:${ref}`);
  }
  const code = await closed;
  if (code !== 0) throw new ScanError(`ERROR image-save-failed image:${ref}`);
}

/** Scans one local image: its inspect fields, then every file of `docker image save`. */
export async function scanImage(
  ref: string,
  collector: Collector,
  classify: Classify,
): Promise<void> {
  collector.inputs += 1;
  for (const [field, text] of inspectFields(await inspect(ref), ref)) {
    collector.check(Buffer.from(text, "utf8"), `image:${ref} inspect:${field}`, classify);
  }
  await scanSave(ref, collector, classify);
}
