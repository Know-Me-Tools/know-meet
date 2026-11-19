/**
 * WC-10 The hosted page serves the new web CSP and nothing else is widened
 * (features/wc-10-web-csp.feature). Packaged then hosted; the negative control
 * and the desktop identity check are packaged-only because they need the default
 * build and the repository. WC-4, WC-7 and WC-8 assert "no CSP violation" in
 * their own runs (wc-network.ts); this spec is the header half.
 *
 * Run inputs: KM_RELEASE_CSP_FILE (generated hosted value, from build:hosted),
 * KM_RELEASE_PREVIOUS_CSP_FILE (the value main served before this phase). A
 * missing input fails with BLOCKED. ASSUMPTION: the packaged compose entry
 * serves the generated header (via the same render as the gateway filter).
 */
import { type APIRequestContext, expect, test } from "@playwright/test";
import {
  canonicalCsp,
  DESKTOP_CSP_GOLDEN,
  diffCsp,
  metaCsp,
  newSourcesIn,
  unadoptedChanges,
} from "./src/csp-delta.ts";
import { attachJson } from "./src/evidence.ts";
import { headerProblems } from "./src/header-checks.ts";
import { defaultBuildUrl, desktopCsp, expectedCsp, previousCsp } from "./src/release-env.ts";

const CRAWL_LIMIT = 150;
const REFERENCE = /["'`]((?:\.{1,2}\/|\/)?[A-Za-z0-9._~@%\-/]+\.(?:m?js|wasm|tflite|task))["'`]/g;

interface DiscoveredAsset {
  readonly url: string;
  readonly kind: "js" | "wasm" | "model";
}

function kindOf(pathname: string): DiscoveredAsset["kind"] {
  if (pathname.endsWith(".wasm")) return "wasm";
  if (pathname.endsWith(".tflite") || pathname.endsWith(".task")) return "model";
  return "js";
}

/** Same-origin scripts, workers, wasm and models reachable from the page, by reading the built files. */
async function discoverAssets(
  request: APIRequestContext,
  origin: string,
): Promise<DiscoveredAsset[]> {
  const root = await request.get("/", { failOnStatusCode: false });
  const html = await root.text();
  const queue: URL[] = [...html.matchAll(/(?:src|href)=["']([^"']+\.m?js)["']/g)].map(
    (m) => new URL(m[1] ?? "", `${origin}/`),
  );
  const seen = new Map<string, DiscoveredAsset>();
  for (let i = 0; i < queue.length && seen.size < CRAWL_LIMIT; i += 1) {
    const url = queue[i];
    if (url === undefined || url.origin !== origin || seen.has(url.href)) continue;
    const kind = kindOf(url.pathname);
    seen.set(url.href, { url: url.href, kind });
    if (kind !== "js") continue;
    const response = await request.get(url.href, { failOnStatusCode: false });
    if (!response.ok()) continue;
    const body = await response.text();
    for (const match of body.matchAll(REFERENCE)) {
      queue.push(new URL(match[1] ?? "", url));
    }
  }
  return [...seen.values()];
}

test.describe("WC-10 The hosted page serves the new web CSP and nothing else is widened", () => {
  test(
    "HTML, scripts, workers and wasm carry the generated CSP; it differs from the previous one only by the adopted sources",
    { tag: ["@WC-10", "@value-critical", "@smoke", "@hosted-only"] },
    async ({ request, baseURL }, testInfo) => {
      const origin = new URL(baseURL ?? "").origin;
      const csp = expectedCsp();
      const previous = previousCsp();

      const changes = diffCsp(previous, csp);
      await attachJson(testInfo, "wc-10-policy-diff.json", { previous, current: csp, changes });
      expect(unadoptedChanges(changes), "changes outside the adopted sources").toEqual([]);
      expect(
        changes.some((c) => c.directive === "script-src" && c.added.includes("'wasm-unsafe-eval'")),
        "the adopted script-src source is present",
      ).toBe(true);

      const page = await request.get("/", { failOnStatusCode: false });
      expect(page.status(), "GET / status").toBe(200);
      const pageProblems = headerProblems(page.headers(), { csp, origin }).filter((p) =>
        p.startsWith("content-security-policy"),
      );
      expect(pageProblems, "/ CSP header").toEqual([]);
      const meta = metaCsp(await page.text());
      if (meta !== null) {
        expect(canonicalCsp(meta), "meta CSP equals the generated policy").toBe(canonicalCsp(csp));
      }

      const assets = await discoverAssets(request, origin);
      const workers = assets.filter((a) => a.kind === "js" && /worker/i.test(a.url));
      const wasm = assets.filter((a) => a.kind === "wasm");
      // Non-vacuity: the oracle needs at least one worker script and one wasm file to look at.
      expect(workers.length, "a worker script was discovered in the built output").toBeGreaterThan(
        0,
      );
      expect(wasm.length, "a wasm file was discovered in the built output").toBeGreaterThan(0);

      const problems: string[] = [];
      const observed: Record<string, unknown> = {};
      for (const asset of [...workers, ...wasm, ...assets.filter((a) => a.kind === "model")]) {
        const response = await request.get(asset.url, { failOnStatusCode: false });
        const headers = response.headers();
        observed[new URL(asset.url).pathname] = {
          status: response.status(),
          contentType: headers["content-type"] ?? "",
        };
        if (response.status() !== 200) problems.push(`${asset.url}: status ${response.status()}`);
        problems.push(
          ...headerProblems(headers, { csp, origin })
            .filter((p) => p.startsWith("content-security-policy"))
            .map((p) => `${new URL(asset.url).pathname} ${p}`),
        );
        const type = (headers["content-type"] ?? "").toLowerCase();
        if (asset.kind === "wasm" && !type.startsWith("application/wasm")) {
          problems.push(
            `${new URL(asset.url).pathname}: content-type "${type}", expected application/wasm`,
          );
        }
        if (asset.kind === "js" && !/javascript/.test(type)) {
          problems.push(`${new URL(asset.url).pathname}: content-type "${type}" is not javascript`);
        }
      }
      await attachJson(testInfo, "wc-10-asset-headers.json", observed);
      expect(problems, "asset header problems").toEqual([]);
    },
  );

  test(
    "the default build's meta CSP has none of the new sources",
    { tag: ["@WC-10", "@negative-control", "@packaged-only"] },
    async ({ request }, testInfo) => {
      const response = await request.get(defaultBuildUrl(), { failOnStatusCode: false });
      expect(response.status(), "the default build serves /").toBe(200);
      const meta = metaCsp(await response.text());
      await attachJson(testInfo, "wc-10-default-build-meta.json", { meta });
      expect(meta, "the default build carries a meta CSP").not.toBeNull();
      expect(newSourcesIn(meta ?? ""), "new sources in the default policy").toEqual([]);
    },
  );

  test(
    "the desktop policy in tauri.conf.json is byte-identical to the base commit's",
    { tag: ["@WC-10", "@value-critical", "@packaged-only"] },
    async ({ baseURL }, testInfo) => {
      const csp = desktopCsp();
      await attachJson(testInfo, "wc-10-desktop-csp.json", { baseURL, csp });
      expect(csp, "tauri.conf.json app.security.csp").toBe(DESKTOP_CSP_GOLDEN);
    },
  );

  test("the diff check flags a widened connect-src and an added eval source", {
    tag: ["@WC-10", "@negative-control"],
  }, async () => {
    const base = "default-src 'self'; script-src 'self'; connect-src 'self'; media-src 'self'";
    const adopted =
      "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; media-src 'self' blob:";
    expect(unadoptedChanges(diffCsp(base, adopted)), "the adopted change passes").toEqual([]);
    expect(
      newSourcesIn(adopted).length,
      "the new-source finder sees the adopted sources",
    ).toBeGreaterThan(0);
    expect(newSourcesIn(base), "and finds none in the base policy").toEqual([]);
    const widened =
      "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' https://evil.example; media-src 'self' blob:";
    expect(
      unadoptedChanges(diffCsp(base, widened)).length,
      "widened connect-src is flagged",
    ).toBeGreaterThan(0);
    const evalAdded = adopted.replace("'wasm-unsafe-eval'", "'wasm-unsafe-eval' 'unsafe-eval'");
    expect(
      unadoptedChanges(diffCsp(base, evalAdded)).length,
      "unsafe-eval is flagged",
    ).toBeGreaterThan(0);
  });
});
