/**
 * Streamdown with the hardened configuration the hostile corpus requires (gate 16.5):
 * - no raw-HTML path: O's rehype chain omits rehype-raw, and vite.config.ts
 *   aliases `rehype-raw` to a stub so its HTML parser (hast-util-raw, parse5)
 *   is not in the bundle at all; raw HTML in model output never becomes DOM;
 * - rehype-sanitize (Streamdown's schema) plus rehype-harden with explicit,
 *   origin-scoped allowlists from MarkdownPolicy (markdown-policy.ts) instead of
 *   Streamdown's allow-all default;
 * - a second check in the `a` and `img` renderers, because rehype-harden passes
 *   some schemes regardless of prefixes (mailto, irc, xmpp, blob);
 * - KaTeX via @streamdown/math (trust stays false), Shiki via @streamdown/code,
 *   Mermaid through the sanitising lazy wrapper;
 * - no link-safety modal and no copy/download controls (extra focus stops).
 */
import { code } from "@streamdown/code";
import { createMathPlugin } from "@streamdown/math";
import { memo, useMemo } from "react";
import { defaultRehypePlugins, Streamdown, type Components, type PluginConfig } from "streamdown";
import { checkLinkUrl, checkMediaUrl } from "../domain/media-policy.ts";
import { buildHardenOptions, type MarkdownPolicy } from "./markdown-policy.ts";
import { safeMermaidPlugin } from "./parts/mermaid-safe.ts";

const math = createMathPlugin({ singleDollarTextMath: true });

const PLUGINS = { math, code, mermaid: safeMermaidPlugin } as unknown as PluginConfig;

type Pluggable = NonNullable<Parameters<typeof Streamdown>[0]["rehypePlugins"]>[number];

function hardened(policy: MarkdownPolicy): Pluggable[] {
  const sanitize = defaultRehypePlugins["sanitize"];
  const harden = defaultRehypePlugins["harden"];
  const hardenFn: unknown = Array.isArray(harden) ? harden[0] : harden;
  if (sanitize === undefined || typeof hardenFn !== "function") throw new Error("Streamdown sanitize/harden plugins are missing");
  return [sanitize, [hardenFn, buildHardenOptions(policy)] as Pluggable];
}

/** Streamdown renders **bold** as a span; keep <strong>. Links and images get the domain policy check. */
function components(policy: MarkdownPolicy): Components {
  return {
    strong: ({ children }) => <strong>{children}</strong>,
    a: ({ href, children }) => {
      const verdict = checkLinkUrl(href, policy.baseOrigin, policy.links);
      return verdict.allowed ? (
        <a href={verdict.href} target="_blank" rel="noopener noreferrer nofollow">
          {children}
        </a>
      ) : (
        <span>{children}</span>
      );
    },
    img: ({ src, alt }) => {
      const verdict = checkMediaUrl(src, policy.mediaOrigins);
      const label = typeof alt === "string" ? alt : "";
      return verdict.allowed ? (
        <img src={verdict.url} alt={label} loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <span data-testid="km-media-blocked">{label === "" ? "Image blocked" : `Image blocked: ${label}`}</span>
      );
    },
  };
}

export interface MarkdownProps {
  readonly text: string;
  readonly streaming: boolean;
  readonly policy: MarkdownPolicy;
}

export const Markdown = memo(function Markdown({ text, streaming, policy }: MarkdownProps) {
  const rehypePlugins = useMemo(() => hardened(policy), [policy]);
  const renderers = useMemo(() => components(policy), [policy]);
  return (
    <Streamdown
      className="km-md"
      mode="streaming"
      parseIncompleteMarkdown
      isAnimating={streaming}
      plugins={PLUGINS}
      components={renderers}
      rehypePlugins={rehypePlugins}
      skipHtml
      controls={false}
      linkSafety={{ enabled: false }}
      codeBlockMaxHeight={0}
      tableMaxHeight={0}
    >
      {text}
    </Streamdown>
  );
});
