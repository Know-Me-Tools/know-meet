import { execFile } from "node:child_process";
import type { Stats } from "node:fs";
import { lstat, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { parseYamlDocuments } from "./mini-yaml.ts";
import { type Classify, type Collector, ScanError } from "./model.ts";

const RENDER_MAX_BUFFER = 256 * 1024 * 1024;
const MANIFEST_FILE = /\.(ya?ml|json)$/i;
/** Public by design (the browser needs it), so a literal value is allowed. */
const PUBLIC_ENV_NAMES: readonly string[] = ["LIVEKIT_URL"];

type Doc = { [key: string]: unknown };

function isRecord(value: unknown): value is Doc {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function label(value: unknown): string {
  return typeof value === "string" && /^[A-Za-z0-9._:-]{1,253}$/.test(value) ? value : "?";
}

/** `Kind/namespace/name`, or `Kind/name` for a cluster-scoped object. */
function describe(doc: Doc): string {
  const raw = doc["metadata"];
  const metadata: Doc = isRecord(raw) ? raw : {};
  const namespace = metadata["namespace"];
  const parts = [label(doc["kind"])];
  if (typeof namespace === "string") parts.push(label(namespace));
  parts.push(label(metadata["name"]));
  return parts.join("/");
}

function isNonEmpty(value: unknown): boolean {
  if (typeof value === "string") return value !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return Object.keys(value).length > 0;
  return false;
}

/** Container `env` entries with a literal LIVEKIT_ value, anywhere in the document. */
function hasLiteralLivekitEnv(node: unknown): boolean {
  if (Array.isArray(node)) return node.some(hasLiteralLivekitEnv);
  if (!isRecord(node)) return false;
  const env = node["env"];
  if (Array.isArray(env)) {
    for (const entry of env) {
      if (!isRecord(entry)) continue;
      const name = entry["name"];
      if (typeof name !== "string" || !name.startsWith("LIVEKIT_")) continue;
      if (PUBLIC_ENV_NAMES.includes(name)) continue;
      if (isNonEmpty(entry["value"])) return true;
    }
  }
  return Object.values(node).some(hasLiteralLivekitEnv);
}

function checkDocument(doc: unknown, collector: Collector): void {
  if (!isRecord(doc)) return;
  const items = doc["items"];
  if (Array.isArray(items) && String(doc["kind"]).endsWith("List")) {
    for (const item of items) checkDocument(item, collector);
    return;
  }
  const where = `manifests:${describe(doc)}`;
  if (doc["kind"] === "Secret") {
    for (const field of ["data", "stringData"]) {
      if (isNonEmpty(doc[field])) collector.add("manifest-secret-value", `${where} (${field})`);
    }
  }
  if (hasLiteralLivekitEnv(doc)) collector.add("manifest-secret-value", `${where} (env)`);
}

function parseManifestText(text: string): unknown[] {
  const trimmed = text.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      throw new ScanError("ERROR manifests-unreadable a manifest is not valid JSON");
    }
  }
  return parseYamlDocuments(text);
}

/** Scans the text with classes 1 to 3, then reads it as documents for class 4. */
function scanManifestText(
  text: string,
  source: string,
  collector: Collector,
  classify: Classify,
): void {
  collector.check(Buffer.from(text, "utf8"), source, classify);
  for (const doc of parseManifestText(text)) checkDocument(doc, collector);
}

function render(repo: string, command: string, args: readonly string[]): Promise<string | null> {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      [...args],
      { cwd: repo, encoding: "utf8", maxBuffer: RENDER_MAX_BUFFER },
      (error, stdout) => {
        if (error === null) {
          resolve(stdout);
        } else if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          resolve(null);
        } else {
          reject(new ScanError(`ERROR manifests-render-failed ${command} exited non-zero`));
        }
      },
    );
  });
}

/** `kustomize build`, or `kubectl kustomize` when kustomize is not installed. */
async function renderProduction(repo: string): Promise<string> {
  const overlay = "infra/k8s/overlays/production";
  const direct = await render(repo, "kustomize", ["build", overlay]);
  if (direct !== null) return direct;
  const viaKubectl = await render(repo, "kubectl", ["kustomize", overlay]);
  if (viaKubectl !== null) return viaKubectl;
  throw new ScanError(
    "ERROR manifests-render-unavailable neither kustomize nor kubectl is on PATH",
  );
}

async function collectFiles(path: string, files: string[]): Promise<void> {
  const entries = await readdir(path, { withFileTypes: true });
  for (const entry of entries) {
    const next = join(path, entry.name);
    if (entry.isDirectory()) await collectFiles(next, files);
    else if (entry.isFile() && MANIFEST_FILE.test(entry.name)) files.push(next);
  }
}

async function readGiven(path: string, collector: Collector, classify: Classify): Promise<void> {
  let stats: Stats;
  try {
    stats = await lstat(path);
  } catch {
    throw new ScanError(`ERROR input-missing manifests:${path}`);
  }
  const files: string[] = [];
  try {
    if (stats.isDirectory()) await collectFiles(path, files);
    else files.push(path);
    for (const file of files) {
      scanManifestText(await readFile(file, "utf8"), `manifests:${file}`, collector, classify);
    }
  } catch (error) {
    if (error instanceof ScanError) throw error;
    throw new ScanError(`ERROR input-unreadable manifests:${path}`);
  }
}

/** Scans rendered manifests: a given file or directory, or a fresh production render. */
export async function scanManifests(
  given: string | undefined,
  repo: string,
  collector: Collector,
  classify: Classify,
): Promise<void> {
  collector.inputs += 1;
  if (given !== undefined) {
    await readGiven(given, collector, classify);
    return;
  }
  scanManifestText(await renderProduction(repo), "manifests:rendered", collector, classify);
}
