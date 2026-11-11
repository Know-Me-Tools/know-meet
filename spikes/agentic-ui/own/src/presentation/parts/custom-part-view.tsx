/**
 * Typed renderer registry for Know Meet CUSTOM chunks. Known names map to a
 * renderer; unknown km.* names get the neutral fallback; values the classifier
 * blocked (schema or media allowlist) render a placeholder and load nothing.
 */
import { useEffect, useState, type ReactNode } from "react";
import type { CustomPart } from "../../domain/transcript-model.ts";
import { KM_CUSTOM, type KmCitation, type KmMedia, type KmMermaid } from "../../infrastructure/custom-chunk-classifier.ts";
import { safeMermaid } from "./mermaid-safe.ts";

type Renderer = (part: CustomPart) => ReactNode;

function CitationPart({ citation }: { readonly citation: KmCitation }) {
  return (
    <sup className="km-citation">
      <a href={citation.url} target="_blank" rel="noopener noreferrer nofollow" title={citation.title} aria-label={`Source ${citation.index}: ${citation.title}`}>
        [{citation.index}]
      </a>
    </sup>
  );
}

function MediaPart({ media }: { readonly media: KmMedia }) {
  if (media.kind === "image") return <img src={media.url} alt={media.label} loading="lazy" className="km-media" />;
  if (media.kind === "video") {
    return <video src={media.url} controls preload="metadata" aria-label={media.label} title={media.label} className="km-media" {...(media.posterUrl === undefined ? {} : { poster: media.posterUrl })} />;
  }
  return <audio src={media.url} controls preload="metadata" aria-label={media.label} title={media.label} />;
}

export function MermaidDiagram({ id, source }: { readonly id: string; readonly source: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    safeMermaid.render(id, source).then(
      (r) => alive && setSvg(r.svg),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [id, source]);
  if (failed) return <pre className="km-code"><code>{source}</code></pre>;
  if (svg === null) return <p className="text-fg-sub text-13">Rendering diagram…</p>;
  // The SVG was produced by mermaid (securityLevel strict) and sanitised with DOMPurify's SVG profile.
  return <div className="km-mermaid" role="img" aria-label="Diagram" dangerouslySetInnerHTML={{ __html: svg }} />;
}

const REGISTRY: Readonly<Record<string, Renderer>> = {
  [KM_CUSTOM.citation]: (part) => <CitationPart citation={part.value as KmCitation} />,
  [KM_CUSTOM.media]: (part) => <MediaPart media={part.value as KmMedia} />,
  [KM_CUSTOM.mermaid]: (part) => {
    const value = part.value as KmMermaid;
    return <MermaidDiagram id={value.diagramId} source={value.source} />;
  },
};

export function CustomPartView({ part }: { readonly part: CustomPart }) {
  if (part.rendering === "blocked") {
    return (
      <div data-testid="km-media-blocked" data-part-name={part.name} className="km-blocked">
        Content blocked{part.blockedReason === undefined ? "" : `: ${part.blockedReason}`}
      </div>
    );
  }
  const render = part.rendering === "renderer" ? REGISTRY[part.name] : undefined;
  if (render === undefined) {
    return (
      <div data-testid="km-custom-unknown" data-part-name={part.name} className="km-blocked">
        Unsupported content ({part.name})
      </div>
    );
  }
  if (part.name === KM_CUSTOM.citation) {
    return (
      <span data-testid="km-custom-part" data-part-name={part.name} className="km-part-inline">
        {render(part)}
      </span>
    );
  }
  return (
    <div data-testid="km-custom-part" data-part-name={part.name} className="km-part-block">
      {render(part)}
    </div>
  );
}
