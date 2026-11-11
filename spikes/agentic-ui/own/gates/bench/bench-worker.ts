/** Worker half of bench.ts ?mode=worker. */
import { createHighlighter } from "shiki";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
const opts = { lang: "typescript", themes: { light: "github-light", dark: "github-dark" } } as const;
self.onmessage = async (e: MessageEvent<string[]>) => {
  const fences = e.data;
  const t = (): number => performance.now();
  let s = t();
  const hl = await createHighlighter({ themes: ["github-light", "github-dark"], langs: ["typescript"], engine: createJavaScriptRegexEngine({ forgiving: true }) });
  const out: Record<string, number> = { createHighlighterMs: t() - s };
  s = t(); hl.codeToTokens(fences[0] ?? "", opts); out.firstTokensMs = t() - s;
  s = t(); for (const f of fences) hl.codeToTokens(f, opts); out.all22Ms = t() - s;
  postMessage(out);
};
