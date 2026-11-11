// TJ-ARCH-MOB-001 compliant
import type { Plugin } from "vite";

/**
 * Injects the Content-Security-Policy as the first <head> element of the
 * production build. Build only: the dev server needs inline HMR styles and its
 * own websocket, and the Tauri host enforces its config CSP in production.
 */
export function cspMetaPlugin(policy: string): Plugin {
  return {
    name: "know-meet-csp-meta",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler: () => [
        {
          tag: "meta",
          attrs: { "http-equiv": "Content-Security-Policy", content: policy },
          injectTo: "head-prepend",
        },
      ],
    },
  };
}
