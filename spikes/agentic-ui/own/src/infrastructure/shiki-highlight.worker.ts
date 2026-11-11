/**
 * Worker side of worker-code-highlighter.ts: the unchanged @streamdown/code plugin (Shiki, JavaScript
 * regex engine, its own result cache and incremental grammar-state cache for streaming blocks), run
 * off the main thread. Replies drop `grammarState`, which is not structured-cloneable and which
 * Streamdown's renderer does not read.
 */
import { createCodePlugin, type HighlightResult } from "@streamdown/code";
import type { HighlightReply, HighlightRequest } from "./worker-code-highlighter.ts";

const plugin = createCodePlugin();
const scope = self as unknown as { onmessage: ((e: MessageEvent<HighlightRequest>) => void) | null; postMessage(m: HighlightReply): void };

function reply(id: number, result: HighlightResult): void {
  const { grammarState: _dropped, ...cloneable } = result as HighlightResult & { grammarState?: unknown };
  scope.postMessage({ id, result: cloneable as HighlightResult });
}

scope.onmessage = ({ data }) => {
  try {
    const sync = plugin.highlight(
      { code: data.code, language: data.language as never, themes: [data.themes[0], data.themes[1]] as never, isIncomplete: data.isIncomplete },
      (result) => reply(data.id, result),
    );
    if (sync !== null) reply(data.id, sync);
  } catch (error: unknown) {
    scope.postMessage({ id: data.id, error: error instanceof Error ? error.message : String(error) });
  }
};
