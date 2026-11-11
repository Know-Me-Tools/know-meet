/**
 * Gate 16.3 follow-up: the Shiki worker under the apps/web CSP (16.5 "after" policy + the harness
 * origin in connect-src, as in c15). Serves the page with that header, streams long-markdown and
 * records CSP violations, whether the worker was used, and how many highlighted spans rendered.
 *
 *   node gates/scripts/csp-worker-check.ts --url http://127.0.0.1:4298/ [--browsers webkit,chromium]
 */
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";

const require = createRequire(resolve(import.meta.dirname, "../../../harness/package.json"));
const pw = require("@playwright/test") as typeof import("@playwright/test");
const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i] ?? "", process.argv[i + 1] ?? "");
const url = args.get("--url") ?? "http://127.0.0.1:4298/";
const harness = "http://127.0.0.1:4317";
const CSP = `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; font-src 'self'; connect-src 'self' ipc: http://ipc.localhost ${harness}`;
const results: unknown[] = [];
for (const name of (args.get("--browsers") ?? "webkit,chromium").split(",") as ("webkit" | "chromium")[]) {
  const browser = await pw[name].launch();
  const page = await (await browser.newContext()).newPage();
  await page.addInitScript(() => {
    const w = window as unknown as { __csp: string[] };
    w.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => w.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  // Chromium: Playwright request interception breaks the harness's SSE stream (TRANSPORT_ERROR even
  // with no CSP), so there the policy is delivered as a <meta http-equiv> inserted before any script.
  const viaMeta = name === "chromium";
  if (viaMeta)
    await page.addInitScript((csp: string) => {
      const m = document.createElement("meta");
      m.httpEquiv = "Content-Security-Policy";
      m.content = csp;
      (document.head ?? document.documentElement).prepend(m);
    }, CSP);
  const workers: string[] = [];
  page.on("worker", (w) => workers.push(w.url().replace(/^https?:\/\/[^/]+/, "")));
  const u = new URL(url);
  for (const [k, v] of Object.entries({ scenario: "long-markdown", agui: harness, session: `csp-${name}-${Date.now()}`, allowMediaOrigin: harness })) u.searchParams.set(k, v);
  if (!viaMeta) await page.route((req) => req.href === u.toString(), async (route) => {
    const res = await route.fetch();
    await route.fulfill({ response: res, headers: { ...res.headers(), "content-security-policy": CSP } });
  });
  await page.goto(u.toString());
  await page.waitForFunction(() => (window as unknown as { __spike?: { ready?: boolean } }).__spike?.ready === true);
  await page.getByTestId("km-composer-input").fill("Summarise the whole meeting in detail.");
  await page.getByTestId("km-composer-submit").click();
  await page.waitForFunction(() => ["finished", "error", "cancelled", "interrupted"].includes((window as unknown as { __spike: { snapshot(): { runStatus: string } } }).__spike.snapshot().runStatus), undefined, { timeout: 120_000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => ({
    status: (window as unknown as { __spike: { snapshot(): { runStatus: string } } }).__spike.snapshot().runStatus,
    error: JSON.stringify((window as unknown as { __spike: { snapshot(): unknown } }).__spike.snapshot()).match(/"runError[^,]*,[^,]*/)?.[0] ?? null,
    violations: (window as unknown as { __csp: string[] }).__csp,
    pre: document.querySelectorAll("pre").length,
    highlightedSpans: document.querySelectorAll("pre span[style]").length,
  }));
  results.push({ browser: name, csp: CSP, delivery: viaMeta ? "meta" : "header", workers, ...r });
  console.log(JSON.stringify(results.at(-1)));
  await browser.close();
}
writeFileSync(resolve(import.meta.dirname, "../raw/16-3-followup/csp-worker-check.json"), `${JSON.stringify(results, null, 1)}\n`);
