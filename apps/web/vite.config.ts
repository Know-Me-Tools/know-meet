// TJ-ARCH-MOB-001 compliant

import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import {
  buildContentSecurityPolicy,
  LIVEKIT_URL_ENV,
  MEDIA_ORIGINS_ENV,
} from "./scripts/content-security-policy.ts";
import { cspMetaPlugin } from "./scripts/csp-meta-plugin.ts";

const SOURCE_ROOT = fileURLToPath(new URL("./src/", import.meta.url));

// Read from the process environment only (not .env files), so the web build and
// the Tauri wrapper always see the same value.
const contentSecurityPolicy = buildContentSecurityPolicy({
  livekitUrl: process.env[LIVEKIT_URL_ENV],
  mediaOrigins: process.env[MEDIA_ORIGINS_ENV],
});

export default defineConfig({
  plugins: [tailwindcss(), cspMetaPlugin(contentSecurityPolicy)],
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
