import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

export function sha256(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

export function sha256File(path: string): string {
  return sha256(readFileSync(path));
}

/** Every regular file under `root`, as sorted POSIX paths relative to it. */
export function listFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const stat = statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (stat.isFile()) out.push(relative(root, full).split(sep).join("/"));
    }
  };
  walk(root);
  return out.sort();
}

export interface DirectoryDigest {
  readonly digest: string;
  readonly files: ReadonlyArray<{ readonly path: string; readonly sha256: string }>;
}

/**
 * Content digest of a directory: sha256 over "<path>\0<sha256>\n" for every
 * file in sorted order. Independent of mtimes, permissions and the directory's
 * own location, so two copies with identical bytes give the same digest.
 */
export function digestDirectory(root: string): DirectoryDigest {
  const files = listFiles(root).map((path) => ({ path, sha256: sha256File(join(root, path)) }));
  const digest = sha256(files.map((file) => `${file.path}\0${file.sha256}\n`).join(""));
  return { digest, files };
}
