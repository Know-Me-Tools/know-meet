/**
 * Mermaid diagram, used for ```mermaid fences and km.mermaid chunks. Mermaid is loaded lazily and
 * runs with securityLevel "strict" and SVG (not HTML) labels; the output goes through the SVG
 * sanitizer before it touches the DOM. Invalid source renders as text.
 */
import { useEffect, useId, useState } from "react";
import { sanitizeSvg } from "./svg-sanitizer.ts";

type MermaidApi = (typeof import("mermaid"))["default"];

let loading: Promise<MermaidApi> | null = null;

function loadMermaid(): Promise<MermaidApi> {
  loading ??= import("mermaid").then(({ default: mermaid }) => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "dark",
      htmlLabels: false,
      flowchart: { htmlLabels: false },
      secure: ["secure", "securityLevel", "startOnLoad", "maxTextSize", "htmlLabels", "flowchart", "theme", "themeCSS"],
    });
    return mermaid;
  });
  return loading;
}

let queue: Promise<unknown> = Promise.resolve();

/** Mermaid's render is not re-entrant; serialise calls. */
async function render(source: string, id: string): Promise<string | null> {
  const mermaid = await loadMermaid();
  const run = queue.then(async () => {
    const valid = await mermaid.parse(source, { suppressErrors: true });
    if (valid === false) return null;
    const { svg } = await mermaid.render(id, source);
    return sanitizeSvg(svg, true);
  });
  queue = run.catch(() => null);
  try {
    return await run;
  } catch {
    document.getElementById(id)?.remove();
    document.getElementById(`d${id}`)?.remove();
    return null;
  }
}

type State = { readonly kind: "pending" } | { readonly kind: "svg"; readonly svg: string } | { readonly kind: "failed" };

export function MermaidDiagram({ source, label }: { readonly source: string; readonly label: string }) {
  const rawId = useId();
  const [state, setState] = useState<State>({ kind: "pending" });
  useEffect(() => {
    let live = true;
    const id = `km-mermaid-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
    render(source, id).then(
      (svg) => live && setState(svg === null ? { kind: "failed" } : { kind: "svg", svg }),
      () => live && setState({ kind: "failed" }),
    );
    return () => {
      live = false;
    };
  }, [source, rawId]);

  if (state.kind === "svg") {
    // Sanitized above (DOMPurify SVG profile, no foreignObject/links/external refs).
    return <figure role="img" aria-label={label} className="my-s3 overflow-x-auto rounded-base bg-surface p-s3" dangerouslySetInnerHTML={{ __html: state.svg }} />;
  }
  return (
    <figure className="my-s3 rounded-base bg-surface p-s3">
      <figcaption className="mb-s2 text-xs text-fg-sub">{state.kind === "failed" ? "Diagram could not be rendered" : "Rendering diagram…"}</figcaption>
      <pre className="overflow-x-auto font-mono text-xs text-fg-sub"><code>{source}</code></pre>
    </figure>
  );
}
