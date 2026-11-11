/**
 * Diagnostic (gate 16.3 follow-up), not shipped: where Shiki's first-use cost goes.
 *   ?mode=regex        shiki + createJavaScriptRegexEngine (what @streamdown/code 2.0.0 does)
 *   ?mode=precompiled  @shikijs/langs-precompiled + createJavaScriptRawEngine
 *   ?mode=worker       mode "regex" inside a dedicated Worker; the main thread only awaits messages
 */
import fences from "./fences.json";
const out: Record<string, number> = {};
const t = (): number => performance.now();
const mode = new URLSearchParams(location.search).get("mode") ?? "regex";
const opts = { lang: "typescript", themes: { light: "github-light", dark: "github-dark" } } as const;

async function tokenize(hl: { codeToTokens(code: string, o: typeof opts): unknown }): Promise<void> {
  let s = t(); hl.codeToTokens(fences[0], opts); out.firstTokensMs = t() - s;
  s = t(); hl.codeToTokens(fences[1], opts); out.secondTokensMs = t() - s;
  s = t(); for (const f of fences) hl.codeToTokens(f, opts); out.all22Ms = t() - s;
}

async function regex(): Promise<void> {
  let s = t();
  const { createHighlighter } = await import("shiki");
  const { createJavaScriptRegexEngine } = await import("shiki/engine/javascript");
  out.importMs = t() - s; s = t();
  const hl = await createHighlighter({ themes: ["github-light", "github-dark"], langs: ["typescript"], engine: createJavaScriptRegexEngine({ forgiving: true }) });
  out.createHighlighterMs = t() - s;
  await tokenize(hl);
}

async function precompiled(): Promise<void> {
  let s = t();
  const { createHighlighterCore } = await import("@shikijs/core");
  const { createJavaScriptRawEngine } = await import("@shikijs/engine-javascript/raw");
  const ts = (await import("@shikijs/langs-precompiled/typescript")).default;
  const light = (await import("@shikijs/themes/github-light")).default;
  const dark = (await import("@shikijs/themes/github-dark")).default;
  out.importMs = t() - s; s = t();
  const hl = await createHighlighterCore({ themes: [light, dark], langs: [ts], engine: createJavaScriptRawEngine() });
  out.createHighlighterMs = t() - s;
  await tokenize(hl);
}

async function worker(): Promise<void> {
  // Main-thread view: a 10 ms heartbeat; the largest gap while the worker tokenizes is the block.
  let last = t(); let maxGap = 0; let alive = true;
  const beat = (): void => { const n = t(); maxGap = Math.max(maxGap, n - last); last = n; if (alive) setTimeout(beat, 10); };
  setTimeout(beat, 10);
  const s = t();
  const w = new Worker(new URL("./bench-worker.ts", import.meta.url), { type: "module" });
  const r = await new Promise<Record<string, number>>((res) => { w.onmessage = (e) => res(e.data as Record<string, number>); w.postMessage(fences); });
  alive = false;
  Object.assign(out, r);
  out.workerRoundTripMs = t() - s;
  out.mainThreadMaxGapMs = maxGap;
}

async function run(): Promise<void> {
  if (mode === "precompiled") await precompiled();
  else if (mode === "worker") await worker();
  else await regex();
  (document.getElementById("out") as HTMLElement).textContent = JSON.stringify(out);
  (window as unknown as { __bench: unknown }).__bench = out;
}
void run();
