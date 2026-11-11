import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { REPO_ROOT } from "./repo-paths.ts";

export interface CommandResult {
  readonly command: string;
  readonly cwd: string;
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly startedAt: string;
  readonly durationMs: number;
}

const MAX_BUFFER = 256 * 1024 * 1024;

/** Runs one shell command to completion and returns its full receipt. */
export function runCommand(
  command: string,
  cwd: string = REPO_ROOT,
  env: NodeJS.ProcessEnv = {},
): CommandResult {
  const startedAt = new Date();
  const result = spawnSync(command, {
    cwd,
    shell: true,
    encoding: "utf8",
    maxBuffer: MAX_BUFFER,
    env: { ...process.env, ...env },
  });
  return {
    command,
    cwd,
    exitCode: result.status ?? (result.signal === null ? 1 : 128),
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? result.error?.message ?? "",
    startedAt: startedAt.toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
  };
}

export function combinedOutput(result: CommandResult): string {
  return `${result.stdout}\n${result.stderr}`;
}

export interface BackgroundServer {
  readonly url: string;
  stop(): void;
}

/** Starts a long-running server command and resolves once `url` answers. */
export async function startServer(
  command: string,
  cwd: string,
  url: string,
  timeoutMs = 120_000,
): Promise<BackgroundServer> {
  const child: ChildProcess = spawn(command, { cwd, shell: true, stdio: "ignore", detached: true });
  const stop = (): void => {
    if (child.pid !== undefined) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        /* already exited */
      }
    }
  };
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null)
      throw new Error(`${command} exited with ${child.exitCode} before ${url} answered`);
    try {
      const response = await fetch(url);
      if (response.ok) return { url, stop };
    } catch {
      /* not up yet */
    }
    await new Promise((done) => setTimeout(done, 500));
  }
  stop();
  throw new Error(`${command}: ${url} did not answer within ${timeoutMs}ms`);
}
