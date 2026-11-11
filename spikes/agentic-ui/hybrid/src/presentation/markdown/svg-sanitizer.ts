/**
 * DOMPurify SVG profile shared by raw ```svg fences and Mermaid output: no scripts, no
 * foreignObject HTML, no links or animation that can rewrite an href, no external references
 * (`href`, `xlink:href`, `url(...)` other than in-document `url(#id)`).
 */
import DOMPurify from "dompurify";

const FORBID_TAGS = ["script", "foreignObject", "a", "animate", "set", "animateMotion", "animateTransform", "image", "use", "iframe", "feImage"];
const FORBID_ATTR = ["href", "xlink:href", "src", "action", "formaction"];
const EXTERNAL_URL = /url\(\s*(?!['"]?#)[^)]*\)/gi;

let hooked = false;

function installHooks(): void {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
    if (data.attrName.toLowerCase().startsWith("on")) data.keepAttr = false;
    if (typeof data.attrValue === "string" && EXTERNAL_URL.test(data.attrValue)) data.attrValue = data.attrValue.replace(EXTERNAL_URL, "none");
    EXTERNAL_URL.lastIndex = 0;
  });
  DOMPurify.addHook("uponSanitizeElement", (node, data) => {
    if (data.tagName === "style" && node.textContent !== null) node.textContent = node.textContent.replace(EXTERNAL_URL, "none").replace(/@import[^;]*;?/gi, "");
  });
}

/** Returns sanitized SVG markup, or null when the input is not a single well-formed <svg>. */
export function sanitizeSvg(markup: string, keepStyle: boolean): string | null {
  installHooks();
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
  if (doc.getElementsByTagName("parsererror").length > 0 || doc.documentElement.nodeName.toLowerCase() !== "svg") return null;
  const clean = DOMPurify.sanitize(markup, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: keepStyle ? FORBID_TAGS : [...FORBID_TAGS, "style"],
    FORBID_ATTR,
    ADD_TAGS: keepStyle ? ["style"] : [],
  });
  return clean.trim().startsWith("<svg") ? clean : null;
}
