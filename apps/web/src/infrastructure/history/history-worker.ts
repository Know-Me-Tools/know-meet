// TJ-ARCH-MOB-001 compliant
import { PGlite } from "@electric-sql/pglite";
import initdbWasmUrl from "@electric-sql/pglite/initdb.wasm?url";
import pgliteDataUrl from "@electric-sql/pglite/pglite.data?url";
import pgliteWasmUrl from "@electric-sql/pglite/pglite.wasm?url";
import { worker } from "@electric-sql/pglite/worker";
import { HISTORY_DATA_DIR } from "./history-constants";

/**
 * The shared history worker (wc09 task 9.2). Every tab starts one of these through
 * `PGliteWorker`; PGlite elects a single leader across tabs, and only the leader's
 * `init` runs, so one PGlite instance owns the `idb://` store for the whole origin.
 *
 * The three PGlite binaries come from Vite `?url` imports, so the build emits them as
 * hashed same-origin assets and nothing is fetched from a CDN (connect-src stays
 * closed). They are passed to PGlite explicitly instead of letting it resolve
 * `new URL(..., import.meta.url)` itself.
 */
async function fetchOk(url: string): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`History asset ${url} failed with ${response.status}`);
  return response;
}

async function compileWasm(url: string): Promise<WebAssembly.Module> {
  const response = await fetchOk(url);
  // arrayBuffer + compile, not compileStreaming: it works whatever MIME type serves .wasm.
  return WebAssembly.compile(await response.arrayBuffer());
}

async function fetchBlob(url: string): Promise<Blob> {
  return (await fetchOk(url)).blob();
}

void worker({
  init: async () => {
    const [pgliteWasmModule, initdbWasmModule, fsBundle] = await Promise.all([
      compileWasm(pgliteWasmUrl),
      compileWasm(initdbWasmUrl),
      fetchBlob(pgliteDataUrl),
    ]);
    return PGlite.create({
      dataDir: HISTORY_DATA_DIR,
      pgliteWasmModule,
      initdbWasmModule,
      fsBundle,
    });
  },
});
