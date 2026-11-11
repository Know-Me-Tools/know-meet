export interface Violation {
  readonly path: string;
  readonly line?: number;
  readonly message: string;
}

/** Prints violations as `path[:line]: message` and returns the process exit code. */
export function report(checker: string, violations: readonly Violation[], scanned: number): number {
  for (const v of violations) {
    const where = v.line === undefined ? v.path : `${v.path}:${v.line}`;
    process.stderr.write(`${where}: ${v.message}\n`);
  }
  if (violations.length > 0) {
    process.stderr.write(
      `${checker}: ${violations.length} violation(s) in ${scanned} item(s) checked\n`,
    );
    return 1;
  }
  process.stdout.write(`${checker}: ok (${scanned} item(s) checked)\n`);
  return 0;
}

/** Reads `--cwd <dir>` so tests can point a checker at a scratch repository. */
export function cwdFromArgs(argv: readonly string[]): string {
  const index = argv.indexOf("--cwd");
  const value = index >= 0 ? argv[index + 1] : undefined;
  return value ?? process.cwd();
}
