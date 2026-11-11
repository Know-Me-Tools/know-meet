/**
 * Element overrides and fence renderers for Streamdown. Links keep only http(s)/mailto, images
 * load only from allowlisted origins, `strong` stays semantic, ```svg renders sanitized and
 * ```mermaid goes through the strict Mermaid renderer.
 */
import { createContext, use, type ComponentPropsWithoutRef, type ReactNode } from "react";
import type { SyntaxHighlighterProps } from "@assistant-ui/react-streamdown";
import { isAllowedMediaUrl, safeLinkHref } from "../../domain/url-policy.ts";
import { MermaidDiagram } from "./mermaid-diagram.tsx";
import { sanitizeSvg } from "./svg-sanitizer.ts";

export const MarkdownMediaPolicy = createContext<readonly string[]>([]);

type WithNode<T extends keyof React.JSX.IntrinsicElements> = ComponentPropsWithoutRef<T> & { readonly node?: unknown };

export function SafeLink({ href, children }: WithNode<"a">) {
  const safe = safeLinkHref(href);
  if (safe === null) return <span className="text-fg">{children}</span>;
  return (
    <a href={safe} target="_blank" rel="noopener noreferrer nofollow" className="text-cyan-text underline underline-offset-2">
      {children}
    </a>
  );
}

export function SafeImage({ src, alt }: WithNode<"img">) {
  const origins = use(MarkdownMediaPolicy);
  const url = typeof src === "string" ? src : undefined;
  if (!isAllowedMediaUrl(url, origins)) {
    return <span className="rounded-4 bg-muted px-s1 text-xs text-fg-sub">[image blocked{alt ? `: ${alt}` : ""}]</span>;
  }
  return <img src={url} alt={alt ?? ""} loading="lazy" className="my-s2 max-h-80 max-w-full rounded-8" />;
}

export function Strong({ children }: WithNode<"strong">) {
  return <strong className="font-semibold text-fg">{children}</strong>;
}

function PlainFence({ components: { Pre, Code }, code, language }: SyntaxHighlighterProps): ReactNode {
  return (
    <Pre className="my-s3 overflow-x-auto rounded-base bg-bg-2 p-s3 font-mono text-xs leading-code text-fg">
      <Code className={`language-${language}`}>{code}</Code>
    </Pre>
  );
}

export function SvgFence(props: SyntaxHighlighterProps): ReactNode {
  const clean = sanitizeSvg(props.code, false);
  if (clean === null) return <PlainFence {...props} />;
  // Sanitized above: DOMPurify SVG profile, no script/foreignObject/links/external references.
  return <figure className="my-s3 inline-block rounded-base bg-surface p-s3" role="img" aria-label="SVG image" dangerouslySetInnerHTML={{ __html: clean }} />;
}

export function MermaidFence({ code }: SyntaxHighlighterProps): ReactNode {
  return <MermaidDiagram source={code} label="Diagram" />;
}

export const MARKDOWN_COMPONENTS = { a: SafeLink, img: SafeImage, strong: Strong };
export const FENCES_BY_LANGUAGE = { svg: { SyntaxHighlighter: SvgFence }, mermaid: { SyntaxHighlighter: MermaidFence } };
