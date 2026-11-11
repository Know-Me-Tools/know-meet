/** A2UI content components: Text and allowlisted media (Image, Video, AudioPlayer). */
import { isAllowedMediaUrl } from "../../domain/url-policy.ts";
import type { A2uiProps } from "./layout.tsx";
import { text, useAllowedOrigins } from "./props.ts";

const HEADINGS = { h1: "text-xl", h2: "text-lg", h3: "text-base", h4: "text-15", h5: "text-sm" } as const;

export function Text(p: A2uiProps) {
  const id = p.context.componentModel.id;
  const value = text(p.props, "text");
  const variant = text(p.props, "variant");
  if (variant in HEADINGS) {
    const size = HEADINGS[variant as keyof typeof HEADINGS];
    return <p data-a2ui-id={id} role="heading" aria-level={Number(variant.slice(1))} className={`font-display font-semibold text-fg ${size}`}>{value}</p>;
  }
  const tone = variant === "caption" ? "text-xs text-fg-sub" : "text-sm text-fg";
  return <span data-a2ui-id={id} className={tone}>{value}</span>;
}

function Blocked({ id, label }: { readonly id: string; readonly label: string }) {
  return (
    <span data-a2ui-id={id} data-a2ui-blocked="" className="inline-block rounded-8 bg-muted px-s3 py-s2 text-xs text-fg-sub">
      Media blocked{label === "" ? "" : `: ${label}`}
    </span>
  );
}

export function Image(p: A2uiProps) {
  const id = p.context.componentModel.id;
  const url = text(p.props, "url");
  const alt = text(p.props, "description");
  if (!isAllowedMediaUrl(url, useAllowedOrigins())) return <Blocked id={id} label={alt} />;
  return <img data-a2ui-id={id} src={url} alt={alt} className="max-h-60 max-w-full rounded-8 object-cover" />;
}

export function Video(p: A2uiProps) {
  const id = p.context.componentModel.id;
  const origins = useAllowedOrigins();
  const url = text(p.props, "url");
  const poster = text(p.props, "posterUrl");
  if (!isAllowedMediaUrl(url, origins)) return <Blocked id={id} label="video" />;
  const safePoster = isAllowedMediaUrl(poster, origins) ? poster : undefined;
  return <video data-a2ui-id={id} src={url} poster={safePoster} controls preload="metadata" className="max-w-full rounded-8" aria-label="Video" />;
}

export function AudioPlayer(p: A2uiProps) {
  const id = p.context.componentModel.id;
  const url = text(p.props, "url");
  const label = text(p.props, "description");
  if (!isAllowedMediaUrl(url, useAllowedOrigins())) return <Blocked id={id} label={label} />;
  return <audio data-a2ui-id={id} src={url} controls preload="metadata" aria-label={label === "" ? "Audio" : label} />;
}
