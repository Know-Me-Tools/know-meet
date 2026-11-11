/**
 * Gate 16.5: what Streamdown 2.7.1 allows by default versus what O configures.
 * Runs the real rehype-harden function Streamdown ships (defaultRehypePlugins)
 * over a fixed URL matrix, once with Streamdown's default options and once with
 * buildHardenOptions(policy), then applies O's renderer-level checks. Writes the
 * enumeration to gates/raw/streamdown-policy-matrix.json when KM_WRITE_EVIDENCE=1.
 */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { test } from "node:test";
import { defaultRehypePlugins } from "streamdown";
import { checkLinkUrl, checkMediaUrl } from "../src/domain/media-policy.ts";
import { buildHardenOptions, type MarkdownPolicy } from "../src/presentation/markdown-policy.ts";

interface El {
  type: "element";
  tagName: string;
  properties: Record<string, unknown>;
  children: unknown[];
}

type HardenFn = (options: unknown) => (tree: { type: "root"; children: unknown[] }) => void;

const BASE = "tauri://localhost";
const POLICY: MarkdownPolicy = {
  baseOrigin: BASE,
  links: { origins: ["https://know-me.tools"], allowMailto: true },
  mediaOrigins: ["http://127.0.0.1:4317"],
};

const LINKS = [
  "https://know-me.tools/docs/spec-42",
  "https://evil.example/phish",
  "http://know-me.tools/docs",
  "mailto:team@know-me.tools",
  "javascript:alert(1)",
  "data:text/html;base64,PHNjcmlwdD4=",
  "vbscript:msgbox(1)",
  "irc://irc.example/chan",
  "xmpp:user@example.com",
  "blob:tauri://localhost/0f0f",
  "file:///etc/passwd",
  "/relative/path",
  "#section",
];

const IMAGES = [
  "http://127.0.0.1:4317/media/whiteboard.png",
  "http://127.0.0.1:4318/beacon/x.png",
  "https://evil.example/pixel.png",
  "data:image/png;base64,iVBORw0KGgo=",
  "data:image/svg+xml;base64,PHN2Zz4=",
  "blob:tauri://localhost/0f0f",
  "javascript:alert(1)",
  "/local.png",
];

function harden(): HardenFn {
  const entry = defaultRehypePlugins["harden"];
  const fn: unknown = Array.isArray(entry) ? entry[0] : entry;
  if (typeof fn !== "function") throw new Error("streamdown harden plugin missing");
  return fn as HardenFn;
}

function streamdownDefaultOptions(): unknown {
  const entry = defaultRehypePlugins["harden"];
  return Array.isArray(entry) ? entry[1] : undefined;
}

/** What rehype-harden leaves of one element: the surviving URL, or null when it was blocked. */
function hardenOne(options: unknown, tagName: "a" | "img", url: string): string | null {
  const attr = tagName === "a" ? "href" : "src";
  const el: El = { type: "element", tagName, properties: { [attr]: url, ...(tagName === "img" ? { alt: "x" } : {}) }, children: tagName === "a" ? [{ type: "text", value: "x" }] : [] };
  const tree = { type: "root" as const, children: [el] };
  harden()(options)(tree);
  const out = tree.children[0] as Partial<El> | undefined;
  if (out?.type !== "element" || out.tagName !== tagName) return null;
  const value = out.properties?.[attr];
  return typeof value === "string" ? value : null;
}

interface Row {
  readonly url: string;
  readonly streamdownDefault: string | null;
  readonly oHarden: string | null;
  readonly oRendered: string | null;
}

function linkRow(url: string): Row {
  const oHarden = hardenOne(buildHardenOptions(POLICY), "a", url);
  const verdict = oHarden === null ? null : checkLinkUrl(oHarden, BASE, POLICY.links);
  return { url, streamdownDefault: hardenOne(streamdownDefaultOptions(), "a", url), oHarden, oRendered: verdict?.allowed === true ? verdict.href : null };
}

function imageRow(url: string): Row {
  const oHarden = hardenOne(buildHardenOptions(POLICY), "img", url);
  const verdict = oHarden === null ? null : checkMediaUrl(oHarden, POLICY.mediaOrigins);
  return { url, streamdownDefault: hardenOne(streamdownDefaultOptions(), "img", url), oHarden, oRendered: verdict?.allowed === true ? verdict.url : null };
}

test("Streamdown 2.7.1 default rehype chain is raw -> sanitize -> harden(allow-all)", () => {
  assert.deepEqual(Object.keys(defaultRehypePlugins), ["raw", "sanitize", "harden"]);
  assert.deepEqual(streamdownDefaultOptions(), { allowedImagePrefixes: ["*"], allowedLinkPrefixes: ["*"], allowedProtocols: ["*"], defaultOrigin: undefined, allowDataImages: true });
});

test("O's harden options are origin-scoped, with no wildcard, no data images, no extra protocols", () => {
  const o = buildHardenOptions(POLICY);
  assert.deepEqual(o.allowedLinkPrefixes, ["https://know-me.tools/"]);
  assert.deepEqual(o.allowedImagePrefixes, ["http://127.0.0.1:4317/"]);
  assert.deepEqual(o.allowedProtocols, []);
  assert.equal(o.allowDataImages, false);
  assert.ok(![...o.allowedLinkPrefixes, ...o.allowedImagePrefixes].includes("*"));
});

test("an empty policy allows no http(s) link or image at all", () => {
  const empty: MarkdownPolicy = { baseOrigin: BASE, links: { origins: [], allowMailto: false }, mediaOrigins: [] };
  const options = buildHardenOptions(empty);
  assert.equal(hardenOne(options, "a", "https://know-me.tools/x"), null);
  assert.equal(hardenOne(options, "img", "http://127.0.0.1:4317/media/whiteboard.png"), null);
  assert.equal(checkLinkUrl("mailto:a@b.c", BASE, empty.links).allowed, false);
});

test("enumerated link and image matrix: default vs O", () => {
  const links = LINKS.map(linkRow);
  const images = IMAGES.map(imageRow);
  if (process.env["KM_WRITE_EVIDENCE"] === "1") {
    const file = new URL("../gates/raw/streamdown-policy-matrix.json", import.meta.url);
    writeFileSync(file, `${JSON.stringify({ streamdown: "2.7.1", defaultHardenOptions: streamdownDefaultOptions(), oHardenOptions: buildHardenOptions(POLICY), policy: POLICY, links, images }, null, 2)}\n`);
  }
  const rendered = (rows: readonly Row[]): string[] => rows.filter((r) => r.oRendered !== null).map((r) => r.url);
  assert.deepEqual(rendered(links), ["https://know-me.tools/docs/spec-42", "mailto:team@know-me.tools"]);
  assert.deepEqual(rendered(images), ["http://127.0.0.1:4317/media/whiteboard.png"]);
  // The default really is allow-all for http(s) links and images, and allows data: images.
  const byUrl = (rows: readonly Row[], url: string): Row | undefined => rows.find((r) => r.url === url);
  assert.equal(byUrl(links, "https://evil.example/phish")?.streamdownDefault, "https://evil.example/phish");
  assert.equal(byUrl(images, "https://evil.example/pixel.png")?.streamdownDefault, "https://evil.example/pixel.png");
  assert.notEqual(byUrl(images, "data:image/png;base64,iVBORw0KGgo=")?.streamdownDefault, null);
  // Neither the default nor O ever lets javascript:/data:text/vbscript:/file: links through harden.
  for (const url of ["javascript:alert(1)", "data:text/html;base64,PHNjcmlwdD4=", "vbscript:msgbox(1)", "file:///etc/passwd"]) {
    assert.equal(byUrl(links, url)?.streamdownDefault, null, url);
    assert.equal(byUrl(links, url)?.oRendered, null, url);
  }
});
