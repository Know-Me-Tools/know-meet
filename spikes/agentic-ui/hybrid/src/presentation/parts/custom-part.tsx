/**
 * Know Meet CUSTOM chunk renderers: superscript citations, allowlisted media (never autoplay),
 * Mermaid diagrams and a neutral fallback for unknown `km.*` names. Rendering is decided by the
 * same pure policy the transcript projection reports (`customRendering`), so DOM and probe agree.
 */
import { customRendering, parseKmCustom, type KmCitation, type KmMedia } from "../../domain/km-custom-parts.ts";
import { safeLinkHref } from "../../domain/url-policy.ts";
import { MermaidDiagram } from "../markdown/mermaid-diagram.tsx";
import { useServices } from "../session-context.tsx";

function Citation({ value }: { readonly value: KmCitation }) {
  const href = safeLinkHref(value.url);
  const marker = <sup className="ml-[1px] font-mono text-11 text-cyan-text">[{value.index}]</sup>;
  return href === null ? (
    <span title={value.title}>{marker}</span>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" aria-label={`Source ${value.index}: ${value.title}`} className="no-underline">
      {marker}
    </a>
  );
}

function Media({ value }: { readonly value: KmMedia }) {
  const { allowedMediaOrigins } = useServices();
  if (customRendering({ kind: "media", value }, allowedMediaOrigins) === "blocked") {
    return (
      <span data-testid="km-media-blocked" className="inline-block rounded-8 bg-muted px-s3 py-s2 text-xs text-fg-sub">
        Media blocked: {value.label} comes from a source that is not allowed.
      </span>
    );
  }
  const poster = value.posterUrl !== undefined && customRendering({ kind: "media", value: { ...value, url: value.posterUrl } }, allowedMediaOrigins) === "renderer" ? value.posterUrl : undefined;
  switch (value.kind) {
    case "image":
      return <img src={value.url} alt={value.label} loading="lazy" className="my-s2 max-h-72 max-w-full rounded-8" />;
    case "video":
      return <video src={value.url} poster={poster} controls preload="metadata" aria-label={value.label} className="my-s2 max-w-full rounded-8" />;
    case "audio":
      return <audio src={value.url} controls preload="metadata" aria-label={value.label} className="my-s2" />;
  }
}

export function KmCustomPart({ name, value }: { readonly name: string; readonly value: unknown }) {
  const part = parseKmCustom(name, value);
  if (part === null) return null;
  if (part.kind === "unknown") {
    return (
      <div data-testid="km-custom-part" data-part-name={name} className="my-s2">
        <div data-testid="km-custom-unknown" role="note" className="rounded-8 bg-muted px-s3 py-s2 text-xs text-fg-sub">
          This message includes content this app cannot show yet ({name}).
        </div>
      </div>
    );
  }
  const inline = part.kind === "citation";
  const Tag = inline ? "span" : "div";
  return (
    <Tag data-testid="km-custom-part" data-part-name={name} className={inline ? "" : "my-s2 block"}>
      {part.kind === "citation" ? <Citation value={part.value} /> : null}
      {part.kind === "media" ? <Media value={part.value} /> : null}
      {part.kind === "mermaid" ? <MermaidDiagram source={part.value.source} label="Decision flow diagram" /> : null}
    </Tag>
  );
}
