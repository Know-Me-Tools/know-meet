// TJ-ARCH-MOB-001 compliant
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { Plugin } from "vite";

/** Where the app serves the MediaPipe tasks-vision WASM file set, same origin. */
export const MEDIAPIPE_WASM_ROUTE = "mediapipe/wasm";

/**
 * Exactly the files @mediapipe/tasks-vision 0.10.x loads at runtime: a SIMD and a no-SIMD
 * build, each a loader script plus the module. The library picks one by feature test and
 * requests it by fixed name from the directory it is given, so names are not hashed.
 */
const WASM_FILES: readonly { readonly name: string; readonly type: string }[] = [
  { name: "vision_wasm_internal.js", type: "text/javascript; charset=utf-8" },
  { name: "vision_wasm_internal.wasm", type: "application/wasm" },
  { name: "vision_wasm_nosimd_internal.js", type: "text/javascript; charset=utf-8" },
  { name: "vision_wasm_nosimd_internal.wasm", type: "application/wasm" },
];

function wasmDirectory(): string {
  const entry = createRequire(import.meta.url).resolve("@mediapipe/tasks-vision");
  return join(dirname(entry), "wasm");
}

/**
 * Serves the tasks-vision WASM set from the app's own origin (wc07 task 7.1, WC-10). The
 * files come from the installed package at build time instead of being committed, so the
 * set always matches the pinned version. `connect-src` stays closed: nothing is fetched
 * from a CDN.
 */
export function mediapipeAssetsPlugin(): Plugin {
  return {
    name: "know-meet-mediapipe-assets",
    configureServer(server) {
      const directory = wasmDirectory();
      server.middlewares.use(`/${MEDIAPIPE_WASM_ROUTE}`, (request, response, next) => {
        const name = (request.url ?? "").split("?")[0]?.replace(/^\//, "") ?? "";
        const file = WASM_FILES.find((candidate) => candidate.name === name);
        if (file === undefined) return next();
        response.setHeader("Content-Type", file.type);
        response.end(readFileSync(join(directory, file.name)));
      });
    },
    generateBundle() {
      const directory = wasmDirectory();
      for (const file of WASM_FILES) {
        this.emitFile({
          type: "asset",
          fileName: `${MEDIAPIPE_WASM_ROUTE}/${file.name}`,
          source: readFileSync(join(directory, file.name)),
        });
      }
    },
  };
}
