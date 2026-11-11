import { lines, type RuleFixture } from "./fixture-types.ts";

const OVER = lines(501);
const exempt = (id: string, path: string): RuleFixture => ({
  id: `lines-exempt-${id}`,
  checker: "lines",
  files: { [path]: lines(600) },
  mustFail: false,
});

export const LINE_FIXTURES: readonly RuleFixture[] = [
  {
    id: "lines-501-ts",
    checker: "lines",
    files: { "apps/web/src/too-long.ts": OVER },
    mustFail: true,
    expectPath: "apps/web/src/too-long.ts",
  },
  {
    id: "lines-501-doc",
    checker: "lines",
    files: { "docs/long-guide.md": OVER },
    mustFail: true,
    expectPath: "docs/long-guide.md",
  },
  {
    id: "lines-501-dart",
    checker: "lines",
    files: { "apps/mobile/lib/room_view.dart": OVER },
    mustFail: true,
    expectPath: "apps/mobile/lib/room_view.dart",
  },
  {
    id: "lines-500-ok",
    checker: "lines",
    files: { "apps/web/src/at-limit.ts": lines(500) },
    mustFail: false,
  },
  exempt("root-live-temporary", "live/meet.html"),
  exempt("prototype", "docs/design/prototype/meet.html"),
  exempt("design-live", "docs/design/live/app.js"),
  exempt("changelog", "CHANGELOG.md"),
  exempt("harness", ".claude/skills/openspec-onboard/SKILL.md"),
  exempt("lockfile", "pnpm-lock.yaml"),
  exempt("generated-dart", "apps/mobile/lib/room.g.dart"),
  exempt("vendor", "packages/ui/vendor/lib.js"),
  exempt("pbxproj", "apps/mobile/ios/Runner.xcodeproj/project.pbxproj"),
  exempt("golden-fixture", "apps/mobile/test/goldens/home.json"),
];

export const NAME_FIXTURES: readonly RuleFixture[] = [
  {
    id: "names-pascal-tsx",
    checker: "names",
    files: { "apps/web/src/MeetingTile.tsx": "" },
    mustFail: true,
    expectPath: "apps/web/src/MeetingTile.tsx",
  },
  {
    id: "names-pascal-dir",
    checker: "names",
    files: { "packages/Ui/index.ts": "" },
    mustFail: true,
    expectPath: "packages/Ui",
  },
  {
    id: "names-camel-dart",
    checker: "names",
    files: { "apps/mobile/lib/roomView.dart": "" },
    mustFail: true,
    expectPath: "apps/mobile/lib/roomView.dart",
  },
  {
    id: "names-kebab-dart",
    checker: "names",
    files: { "apps/mobile/lib/room-view.dart": "" },
    mustFail: true,
    expectPath: "apps/mobile/lib/room-view.dart",
  },
  {
    id: "names-camel-rust",
    checker: "names",
    files: { "crates/core/src/roomState.rs": "" },
    mustFail: true,
    expectPath: "crates/core/src/roomState.rs",
  },
  {
    id: "names-snake-ts",
    checker: "names",
    files: { "packages/domain/src/join_room.ts": "" },
    mustFail: true,
    expectPath: "packages/domain/src/join_room.ts",
  },
  {
    id: "names-allowed",
    checker: "names",
    files: {
      "README.md": "",
      "AGENTS.md": "",
      "CHANGELOG.md": "",
      ".gitignore": "",
      ".github/workflows/ci.yml": "",
      "apps/web/src/meeting-tile.tsx": "",
      "apps/web/src/meeting-tile.test.tsx": "",
      "apps/web/tsconfig.app.json": "",
      "apps/mobile/lib/room_view/room_view.dart": "",
      "apps/mobile/analysis_options.yaml": "",
      "apps/mobile/pubspec.yaml": "",
      "crates/core/Cargo.toml": "",
      "crates/core/src/room_state/mod.rs": "",
      ".claude/skills/openspec-explore/SKILL.md": "",
      "live/AnyName.html": "",
    },
    mustFail: false,
  },
];
