/**
 * Mermaid behind a safety wrapper. @streamdown/mermaid (and mermaid itself,
 * ~2 MB) is loaded lazily on first use; every render is forced to
 * securityLevel "strict" with SVG text labels (no foreignObject HTML), and the
 * SVG output goes through DOMPurify's SVG profile with links, foreignObject,
 * animation and external references removed. `%%{init}%%` directives cannot
 * lower these settings: they are re-applied on every initialize call.
 */
import DOMPurify from "dompurify";

export interface SafeMermaid {
  initialize(config: Record<string, unknown>): void;
  render(id: string, source: string): Promise<{ svg: string }>;
}

/** Streamdown's DiagramPlugin shape (structural; avoids a static import of mermaid). */
export interface SafeDiagramPlugin {
  readonly name: "mermaid";
  readonly type: "diagram";
  readonly language: string;
  getMermaid(config?: Record<string, unknown>): SafeMermaid;
}

const LOCKED_CONFIG = {
  startOnLoad: false,
  securityLevel: "strict",
  htmlLabels: false,
  flowchart: { htmlLabels: false },
  suppressErrorRendering: true,
} as const;

const FORBID_TAGS = ["foreignObject", "a", "script", "animate", "set", "animateMotion", "animateTransform", "image", "use", "iframe", "style"];

export function sanitizeSvg(svg: string): string {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS,
    FORBID_ATTR: ["href", "xlink:href"],
  });
}

let inner: Promise<SafeMermaid> | null = null;
let seq = 0;

function loadInner(): Promise<SafeMermaid> {
  inner ??= import("@streamdown/mermaid").then(({ createMermaidPlugin }) => createMermaidPlugin({ config: { ...LOCKED_CONFIG } }).getMermaid());
  return inner;
}

export const safeMermaid: SafeMermaid = {
  initialize: (config) => {
    void loadInner().then((m) => m.initialize({ ...config, ...LOCKED_CONFIG }));
  },
  render: async (id, source) => {
    const mermaid = await loadInner();
    seq += 1;
    const result = await mermaid.render(`km-${id.replace(/[^a-zA-Z0-9_-]/g, "")}-${seq}`, source);
    return { svg: sanitizeSvg(result.svg) };
  },
};

export const safeMermaidPlugin: SafeDiagramPlugin = {
  name: "mermaid",
  type: "diagram",
  language: "mermaid",
  getMermaid: () => safeMermaid,
};
