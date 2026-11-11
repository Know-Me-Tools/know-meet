import { defineConfig } from "vite";
// shiki is a transitive dependency (via @streamdown/code); resolve it from pnpm's store path.
const SHIKI = "/Users/gqadonis/Projects/know-me/know-meet/spikes/agentic-ui/own/node_modules/.pnpm/shiki@4.6.0/node_modules/shiki/dist";
export default defineConfig({
  root: import.meta.dirname,
  resolve: {
    alias: [
      { find: /^shiki\/engine\/javascript$/, replacement: SHIKI + "/engine-javascript.mjs" },
      { find: /^shiki$/, replacement: SHIKI + "/index.mjs" },
    ],
  },
  worker: { format: "es" },
  build: { outDir: "/tmp/km-bench-dist", emptyOutDir: true },
  logLevel: "warn",
});
