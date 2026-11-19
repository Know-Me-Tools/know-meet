// TJ-ARCH-MOB-001 compliant

import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { buildDefines, outDirOverride, resolveBuildInputs } from "./scripts/build-mode.ts";
import { buildContentSecurityPolicy } from "./scripts/content-security-policy.ts";
import { cspMetaPlugin } from "./scripts/csp-meta-plugin.ts";
import { mediapipeAssetsPlugin } from "./scripts/mediapipe-assets-plugin.ts";

const SOURCE_ROOT = fileURLToPath(new URL("./src/", import.meta.url));

// Read from the process environment only (not .env files), so the web build and
// the Tauri wrapper always see the same value. KM_BUILD_MODE=hosted selects the
// public-site build (build:hosted); unset is the default build used by Tauri and
// local development, whose output directory and defines are unchanged.
const buildInputs = resolveBuildInputs(process.env);
const contentSecurityPolicy = buildContentSecurityPolicy({
  livekitUrl: buildInputs.livekitUrl,
  mediaOrigins: buildInputs.mediaOrigins,
  hosted: buildInputs.hosted,
});

export default defineConfig({
  plugins: [tailwindcss(), cspMetaPlugin(contentSecurityPolicy), mediapipeAssetsPlugin()],
  define: buildDefines(buildInputs),
  build: outDirOverride(buildInputs),
  // wc09: the local-history worker (PGlite) is an ES module worker with its own chunks;
  // the default iife format cannot code-split. PGlite loads its WASM through ?url
  // imports, so it must not be pre-bundled by the dev optimizer.
  worker: { format: "es" },
  optimizeDeps: { exclude: ["@electric-sql/pglite"] },
  resolve: {
    alias: [{ find: /^@\//, replacement: SOURCE_ROOT }],
  },
  server: {
    host: "127.0.0.1",
    port: 1420,
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:3000" },
  },
  clearScreen: false,
});
