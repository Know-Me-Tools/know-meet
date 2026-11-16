import { execFile } from "node:child_process";
import type { Dirent, Stats } from "node:fs";
import { lstat, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { type Classify, type Collector, ScanError } from "./model.ts";

const LS_FILES_MAX_BUFFER = 256 * 1024 * 1024;
const MAX_FILE_BYTES = 512 * 1024 * 1024;

function trackedPaths(repo: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    execFile(
      "git",
      ["-C", repo, "ls-files", "-z"],
      { encoding: "utf8", maxBuffer: LS_FILES_MAX_BUFFER },
      (error, stdout) => {
        if (error !== null) {
          reject(new ScanError("ERROR tracked-files-unavailable git ls-files failed"));
          return;
        }
        resolve(stdout.split("\0").filter((path) => path !== ""));
      },
    );
  });
}

/** Bytes of one regular file, or null for anything else (symlink, submodule, directory). */
async function readRegular(path: string, label: string): Promise<Buffer | null> {
  let stats: Stats;
  try {
    stats = await lstat(path);
  } catch {
    throw new ScanError(`ERROR input-file-missing ${label}`);
  }
  if (!stats.isFile()) return null;
  if (stats.size > MAX_FILE_BYTES) throw new ScanError(`ERROR input-file-too-large ${label}`);
  try {
    return await readFile(path);
  } catch {
    throw new ScanError(`ERROR input-file-unreadable ${label}`);
  }
}

/** Every file `git ls-files` lists. Untracked and ignored files are out of scope. */
export async function scanTracked(
  repo: string,
  collector: Collector,
  classify: Classify,
): Promise<void> {
  collector.inputs += 1;
  for (const rel of await trackedPaths(repo)) {
    const location = `tracked:${rel}`;
    const data = await readRegular(join(repo, rel), location);
    if (data !== null) collector.check(data, location, classify);
  }
}

async function walk(dir: string, relative: string, files: string[]): Promise<void> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    throw new ScanError(`ERROR input-directory-unreadable bundle:${relative}`);
  }
  for (const entry of entries) {
    const next = `${relative}/${entry.name}`;
    if (entry.isDirectory()) await walk(join(dir, entry.name), next, files);
    else if (entry.isFile()) files.push(next);
  }
}

/** Every file under `dir`, recursively. A missing or non-directory input is an error. */
export async function scanBundle(
  dir: string,
  collector: Collector,
  classify: Classify,
): Promise<void> {
  collector.inputs += 1;
  let stats: Stats;
  try {
    stats = await lstat(dir);
  } catch {
    throw new ScanError(`ERROR input-missing bundle:${dir}`);
  }
  if (!stats.isDirectory()) throw new ScanError(`ERROR input-not-a-directory bundle:${dir}`);
  const files: string[] = [];
  await walk(dir, dir.replace(/\/+$/, "") || dir, files);
  for (const path of files) {
    const location = `bundle:${path}`;
    const data = await readRegular(path, location);
    if (data !== null) collector.check(data, location, classify);
  }
}
