import type { BrowserContext, Page } from "@playwright/test";

type Index = "live" | "retained";
type SearchWitness = Readonly<Record<Index, number>>;

interface KmtSearchBrowser extends Window {
  __kmtSearch?: () => SearchWitness;
}

/** Observe the production PGlite worker's PostgreSQL request and reply. */
export async function installKmtSearchWitness(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    const completed = { live: 0, retained: 0 };
    const send = BroadcastChannel.prototype.postMessage;
    BroadcastChannel.prototype.postMessage = function (this: BroadcastChannel, message: unknown) {
      if (
        this.name.startsWith("pglite-tab:") &&
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        message.type === "rpc-call" &&
        "callId" in message &&
        typeof message.callId === "string" &&
        "method" in message &&
        typeof message.method === "string" &&
        message.method.startsWith("execProtocol") &&
        "args" in message &&
        Array.isArray(message.args) &&
        message.args[0] instanceof Uint8Array
      ) {
        const query = new TextDecoder().decode(message.args[0]);
        const index = query.match(/\/\* kmt-(live|retained)-lexical-search \*\//)?.[1];
        if (index === "live" || index === "retained") {
          const callId = message.callId;
          const observe = ({ data }: MessageEvent) => {
            if (data?.callId !== callId) return;
            this.removeEventListener("message", observe);
            if (data.type === "rpc-return") completed[index] += 1;
          };
          this.addEventListener("message", observe);
        }
      }
      send.call(this, message);
    };
    (window as KmtSearchBrowser).__kmtSearch = () => ({ ...completed });
  });
}

export async function completedKmtSearch(page: Page): Promise<SearchWitness> {
  return page.evaluate(() => {
    const observe = (window as KmtSearchBrowser).__kmtSearch;
    if (!observe) throw new Error("BLOCKED: PGlite search witness unavailable");
    return observe();
  });
}
