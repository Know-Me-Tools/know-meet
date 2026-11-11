import type { RuleFixture } from "./fixture-types.ts";

// Secret-shaped values are assembled at runtime so this source never matches the scans itself.
const FAKE = ["Ab3", "Cd4", "Ef5", "Gh6", "Ij7", "Kl8", "Mn9"].join("");
const LK = (suffix: "SECRET" | "KEY"): string => ["LIVEKIT", "API", suffix].join("_");

const secret = (id: string, path: string, content: string): RuleFixture => ({
  id: `secrets-${id}`,
  checker: "secrets",
  files: { [path]: content },
  mustFail: true,
  expectPath: path,
});

export const SECRET_FIXTURES: readonly RuleFixture[] = [
  secret("env", "deploy/livekit.env", `${LK("SECRET")}=${FAKE}\n`),
  secret("env-export-key", "deploy/run.sh", `export ${LK("KEY")}="${FAKE}"\n`),
  secret("yaml", "deploy/values.yaml", `${LK("KEY")}: ${FAKE}\n`),
  secret("json", "deploy/config.json", `{ "${LK("SECRET").toLowerCase()}": "${FAKE}" }\n`),
  secret("go-walrus", "services/bff/main.go", `${LK("SECRET")} := "${FAKE}"\n`),
  secret("camel-ts", "apps/web/src/token.ts", `const livekitApiKey = "${FAKE}";\n`),
  secret("ruby-arrow", "deploy/conf.rb", `${LK("KEY").toLowerCase()} => "${FAKE}"\n`),
  secret("api-key", "apps/web/src/client.ts", `api_key = "${FAKE.slice(0, 14)}"\n`),
  secret("sk-token", "packages/core/src/llm.ts", `const k = "${["sk", FAKE].join("-")}";\n`),
  {
    id: "secrets-env-reference-ok",
    checker: "secrets",
    files: {
      "deploy/values.yaml": `${LK("SECRET")}: \${{ secrets.${LK("SECRET")} }}\n`,
      "deploy/run.sh": `${LK("KEY")}="\${${LK("KEY")}}"\n`,
      "apps/web/src/env.ts": `const key = process.env.${LK("KEY")};\n`,
    },
    mustFail: false,
  },
];

export const COLOUR_FIXTURES: readonly RuleFixture[] = [
  {
    id: "colours-tsx",
    checker: "colours",
    files: { "apps/web/src/tile.tsx": 'const c = "#1A2B3C";\n' },
    mustFail: true,
    expectPath: "apps/web/src/tile.tsx",
  },
  {
    id: "colours-css",
    checker: "colours",
    files: { "packages/ui/src/button.css": ".b { color: #fff; }\n" },
    mustFail: true,
    expectPath: "packages/ui/src/button.css",
  },
  {
    id: "colours-dart",
    checker: "colours",
    files: { "apps/mobile/lib/theme.dart": "const c = Color(0xFF112233);\n" },
    mustFail: true,
    expectPath: "apps/mobile/lib/theme.dart",
  },
  {
    id: "colours-allowed",
    checker: "colours",
    files: {
      "apps/web/src/tile.tsx": 'const c = "var(--km-accent)"; const href = "#section";\n',
      "packages/ui/src/tokens.generated.css": ":root { --km-accent: #1a2b3c; }\n",
      "apps/mobile/lib/theme/tokens.g.dart": "const c = Color(0xFF112233);\n",
      "docs/design/tokens.css": ":root { --km-accent: #1a2b3c; }\n",
    },
    mustFail: false,
  },
];

export const BOUNDARY_FIXTURES: readonly RuleFixture[] = [
  {
    id: "boundaries-dart-flutter-in-domain",
    checker: "boundaries",
    files: { "apps/mobile/lib/room/domain/room.dart": "import 'package:flutter/material.dart';\n" },
    mustFail: true,
    expectPath: "apps/mobile/lib/room/domain/room.dart",
  },
  {
    id: "boundaries-dart-presentation-in-application",
    checker: "boundaries",
    files: {
      "apps/mobile/lib/room/application/join.dart": "import '../presentation/room_view.dart';\n",
    },
    mustFail: true,
    expectPath: "apps/mobile/lib/room/application/join.dart",
  },
  {
    id: "boundaries-dart-presentation-ok",
    checker: "boundaries",
    files: {
      "apps/mobile/lib/room/presentation/room_view.dart":
        "import 'package:flutter/material.dart';\n",
    },
    mustFail: false,
  },
];

export const BIOME_FIXTURES: readonly RuleFixture[] = [
  {
    id: "biome-any",
    checker: "biome",
    files: { "apps/web/src/parse.ts": "export const parse = (raw: any): unknown => raw;\n" },
    mustFail: true,
    expectPath: "apps/web/src/parse.ts",
    expectText: "noExplicitAny",
  },
  {
    id: "biome-react-in-domain",
    checker: "biome",
    files: {
      "packages/domain/src/room.ts":
        'import { useState } from "react";\n\nexport const hook = useState;\n',
    },
    mustFail: true,
    expectPath: "packages/domain/src/room.ts",
    expectText: "noRestrictedImports",
  },
  {
    id: "biome-livekit-in-application",
    checker: "biome",
    files: {
      "packages/application/src/join.ts":
        'import { Room } from "livekit-client";\n\nexport const make = (): Room => new Room();\n',
    },
    mustFail: true,
    expectPath: "packages/application/src/join.ts",
    expectText: "noRestrictedImports",
  },
  {
    id: "biome-tauri-in-domain",
    checker: "biome",
    files: {
      "apps/web/src/room/domain/window.ts":
        'import { invoke } from "@tauri-apps/api/core";\n\nexport const call = invoke;\n',
    },
    mustFail: true,
    expectPath: "apps/web/src/room/domain/window.ts",
    expectText: "noRestrictedImports",
  },
  {
    id: "biome-infrastructure-in-application",
    checker: "biome",
    files: {
      "apps/web/src/room/application/join.ts":
        'import { http } from "../infrastructure/http.ts";\n\nexport const join = http;\n',
    },
    mustFail: true,
    expectPath: "apps/web/src/room/application/join.ts",
    expectText: "noRestrictedImports",
  },
  {
    id: "biome-presentation-react-ok",
    checker: "biome",
    files: {
      "apps/web/src/room/presentation/use-room.ts":
        'import { useState } from "react";\n\nexport const useRoom = useState;\n',
    },
    mustFail: false,
  },
];
