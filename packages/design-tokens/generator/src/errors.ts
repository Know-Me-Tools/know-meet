// Replaces vendor common.mts (ToolError, assert, main) with the same contract:
// a ToolError carries the process exit code; anything else exits 1.

/** sysexits-style codes, so callers and CI can tell failure kinds apart. */
export const EXIT = {
  usage: 64,
  invalidData: 65,
  missingInput: 66,
  missingOutput: 73,
  drift: 1,
} as const;

export class ToolError extends Error {
  readonly code: number;

  constructor(message: string, code: number = EXIT.invalidData) {
    super(message);
    this.name = "ToolError";
    this.code = code;
  }
}

export function assert(
  condition: unknown,
  message: string,
  code: number = EXIT.invalidData,
): asserts condition {
  if (!condition) throw new ToolError(message, code);
}

export async function main(fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = error instanceof ToolError ? error.code : 1;
  }
}
