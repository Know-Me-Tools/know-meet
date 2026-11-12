/**
 * 500-line rule exceptions (AGENTS.md "File size", constraints.md
 * max-500-lines-per-file). IDs follow the hybrid-shell-foundation assessment.
 * Changing this list changes policy: it needs an operator decision first.
 */
export const LINE_LIMIT = 500;

export const LINE_EXCEPTIONS: Readonly<Record<string, readonly string[]>> = {
  "E-L1 lockfiles": ["**/pnpm-lock.yaml", "**/Cargo.lock", "**/pubspec.lock"],
  "E-L2 generated code": [
    "**/*.g.dart",
    "**/*.freezed.dart",
    "**/routeTree.gen.ts",
    "**/src-tauri/gen/**",
    "**/frb_generated*",
    "apps/mobile/lib/src/rust/**",
    ".kbd-orchestrator/**/*.json",
    ".kbd-orchestrator/**/*.jsonl",
    ".kbd-orchestrator/**/*.sig",
    ".kbd-orchestrator/**/review/**/raw-*.txt",
    ".kbd-orchestrator/**/evidence/**/*.txt",
    ".kbd-orchestrator/**/evidence/**/*.log",
    ".agent-team/**/state.json",
    ".agent-team/**/team.json",
  ],
  "E-L3 vendored code": ["**/vendor/**"],
  "E-L4 native platform project files": [
    "**/*.pbxproj",
    "**/*.xcworkspacedata",
    "**/*.xcscheme",
    "**/*.storyboard",
    "**/*.xib",
    "**/gradlew",
    "**/gradlew.bat",
  ],
  "E-L5 test fixtures, goldens and snapshots": [
    "**/fixtures/**",
    "spikes/**/corpus/**",
    "spikes/**/evidence/**",
    "spikes/**/raw/**",
    "docs/design/prototype-v1-archive/**",
    "**/goldens/**",
    "**/__snapshots__/**",
    "**/*.snap",
    "tests/fidelity/baselines/**",
    "tests/fidelity/baselines-v1-archive/**",
  ],
  "E-L6 frozen design prototypes": [
    "docs/design/prototype/**",
    "docs/design/live/**",
    // Temporary operator exception (2026-11-09, c01 task 1.6) until root live/ is removed.
    "live/**",
  ],
  "E-L7 changelog": ["**/CHANGELOG.md"],
  "E-L8 AI-harness skill and command files": [
    ".agents/**",
    ".claude/**",
    ".codex/**",
    ".dsh/**",
    ".kimi-code/**",
    ".opencode/**",
    ".qwen/**",
    ".zed/**",
  ],
};

export const ALL_LINE_EXCEPTION_GLOBS: readonly string[] = Object.values(LINE_EXCEPTIONS).flat();
