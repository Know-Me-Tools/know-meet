import { PGlite } from "@electric-sql/pglite";
import initdbWasmUrl from "@electric-sql/pglite/initdb.wasm?url";
import pgliteDataUrl from "@electric-sql/pglite/pglite.data?url";
import pgliteWasmUrl from "@electric-sql/pglite/pglite.wasm?url";
import { worker } from "@electric-sql/pglite/worker";

async function binary(path: string): Promise<Response> {
  const url = new URL(path, self.location.origin);
  if (url.origin !== self.location.origin) throw new Error("Unexpected transcript store asset");
  const response = await fetch(url, { credentials: "omit", redirect: "error" });
  if (!response.ok) throw new Error("Transcript store assets unavailable");
  return response;
}

void worker({
  init: async ({ meta }) => {
    const [pgliteWasmModule, initdbWasmModule, fsBundle] = await Promise.all([
      binary(pgliteWasmUrl).then(async (r) => WebAssembly.compile(await r.arrayBuffer())),
      binary(initdbWasmUrl).then(async (r) => WebAssembly.compile(await r.arrayBuffer())),
      binary(pgliteDataUrl).then((r) => r.blob()),
    ]);
    return PGlite.create({
      dataDir:
        meta?.transcriptStorage === "memory" ? "memory://" : "idb://know-meet-local-transcripts-v1",
      pgliteWasmModule,
      initdbWasmModule,
      fsBundle,
    });
  },
});
