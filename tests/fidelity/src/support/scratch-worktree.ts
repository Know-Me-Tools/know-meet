import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { REPO_ROOT } from "./repo-paths.ts";
import { runCommand } from "./run-command.ts";

/**
 * A detached git worktree of the tested commit in the OS temp directory, used
 * by negative controls ("scratch branch" in the contract). The committed tree
 * and the working copy are never modified. Always call `remove()`.
 */
export interface ScratchWorktree {
  readonly dir: string;
  remove(): void;
}

export function createScratchWorktree(label: string): ScratchWorktree {
  const parent = mkdtempSync(join(tmpdir(), `km-${label}-`));
  const dir = join(parent, "tree");
  const added = runCommand(`git worktree add --detach "${dir}" HEAD`, REPO_ROOT);
  if (added.exitCode !== 0) throw new Error(`git worktree add failed: ${added.stderr}`);
  return {
    dir,
    remove: () => {
      runCommand(`git worktree remove --force "${dir}"`, REPO_ROOT);
      rmSync(parent, { recursive: true, force: true });
    },
  };
}

/** Installs dependencies in a scratch worktree from the committed lockfile, offline first. */
export function installScratch(dir: string): void {
  const install = runCommand("pnpm install --frozen-lockfile --prefer-offline", dir);
  if (install.exitCode !== 0)
    throw new Error(`scratch install failed: ${install.stderr.slice(-2000)}`);
}

export function scratchTempDir(label: string): { dir: string; remove(): void } {
  const dir = mkdtempSync(join(tmpdir(), `km-${label}-`));
  return { dir, remove: () => rmSync(dir, { recursive: true, force: true }) };
}
