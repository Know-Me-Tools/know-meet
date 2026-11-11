import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const FONT_FILE = /\.(woff2?|ttf|otf|eot)(\?.*)?$/;

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      // Production React ignores <Profiler onRender>; the probe's `commits` needs the profiling build.
      { find: /^react-dom\/client$/, replacement: "react-dom/profiling" },
      // Gate 16.5: O never runs rehype-raw; keep the HTML parser out of the bundle.
      { find: /^rehype-raw$/, replacement: fileURLToPath(new URL("./src/infrastructure/rehype-raw-disabled.ts", import.meta.url)) },
    ],
  },
  build: {
    target: "es2022",
    sourcemap: true,
    chunkSizeWarningLimit: 4096,
    // Gate 16.5: KaTeX fonts are emitted as self-hosted files, never inlined as data: URLs (CSP font-src 'self').
    assetsInlineLimit: (file) => (FONT_FILE.test(file) ? false : undefined),
  },
  server: { port: 5174, fs: { allow: ["../../.."] } },
  preview: { port: 4173, strictPort: true },
});
