import type { BrowserContext, Page } from "@playwright/test";

/**
 * VS-5 oracle support. In a plain browser `isTauri()` from @tauri-apps/api v2
 * reads `globalThis.isTauri` only, so guarded code never reads the runtime
 * globals below; `'x' in window` checks don't trigger a getter either. Any read
 * of these globals is therefore an unguarded Tauri API call, and is recorded
 * with its stack before returning undefined (which is what the real browser
 * would yield).
 */
const TAURI_GLOBALS = [
  "__TAURI_INTERNALS__",
  "__TAURI__",
  "__TAURI_IPC__",
  "__TAURI_METADATA__",
] as const;

export async function installTauriTrap(context: BrowserContext): Promise<void> {
  await context.addInitScript(
    (names: readonly string[]) => {
      const reads: string[] = [];
      Object.defineProperty(window, "__kmTauriReads", { value: reads, configurable: false });
      for (const name of names) {
        Object.defineProperty(window, name, {
          configurable: true,
          get() {
            reads.push(`${name}\n${new Error("unguarded Tauri global read").stack ?? ""}`);
            return undefined;
          },
        });
      }
    },
    [...TAURI_GLOBALS],
  );
}

export async function tauriReads(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const value: unknown = Reflect.get(window, "__kmTauriReads");
    return Array.isArray(value) ? value.map(String) : [];
  });
}

/**
 * Simulates the Tauri runtime for the VS-2 titlebar check: the same bundle,
 * with the globals Tauri 2 injects, so `isTauri()` is true and window APIs
 * resolve. Used only to prove the titlebar path renders in the shared bundle.
 */
export async function simulateTauriRuntime(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    Reflect.set(globalThis, "isTauri", true);
    Reflect.set(window, "__TAURI_INTERNALS__", {
      invoke: async () => null,
      transformCallback: () => 0,
      metadata: {
        currentWindow: { label: "main" },
        currentWebview: { windowLabel: "main", label: "main" },
      },
    });
  });
}
