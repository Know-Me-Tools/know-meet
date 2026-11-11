import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * React drops <Profiler onRender> in production builds, so `renderCounts().commits` would read 0.
 * Aliasing `react-dom/client` to the profiling build keeps commits countable in `vite preview`
 * (same measurement method as prototype O, so the numbers are comparable; costs bundle weight).
 */
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: { alias: [{ find: /^react-dom\/client$/, replacement: "react-dom/profiling" }] },
  build: { target: "es2022", sourcemap: true, chunkSizeWarningLimit: 4096 },
  server: { port: 5175, fs: { allow: ["../../.."] } },
  preview: { port: 4175, strictPort: true },
});
