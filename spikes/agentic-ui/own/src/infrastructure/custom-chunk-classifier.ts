/**
 * Classifies AG-UI CUSTOM events for the renderer registry: known Know Meet
 * chunks are validated with zod (mirroring the harness's km.* schemas) and
 * media is checked against the origin allowlist. Invalid or disallowed
 * values render as "blocked"; unknown km.* names render the neutral fallback.
 */
import { z } from "zod";
import { checkMediaUrl } from "../domain/media-policy.ts";
import type { CustomPart } from "../domain/transcript-model.ts";

export const KM_CUSTOM = { citation: "km.citation", media: "km.media", mermaid: "km.mermaid" } as const;

export const KmCitationSchema = z
  .object({
    messageId: z.string().min(1),
    citationId: z.string().min(1),
    index: z.number().int().positive(),
    title: z.string().min(1),
    url: z.string().url(),
    snippet: z.string().optional(),
  })
  .strict();

export const KmMediaSchema = z
  .object({
    messageId: z.string().min(1),
    mediaId: z.string().min(1),
    kind: z.enum(["image", "video", "audio"]),
    url: z.string().url(),
    mimeType: z.string().min(1),
    label: z.string().min(1),
    posterUrl: z.string().url().optional(),
  })
  .strict();

export const KmMermaidSchema = z.object({ messageId: z.string().min(1), diagramId: z.string().min(1), source: z.string().min(1) }).strict();

export type KmCitation = z.infer<typeof KmCitationSchema>;
export type KmMedia = z.infer<typeof KmMediaSchema>;
export type KmMermaid = z.infer<typeof KmMermaidSchema>;

type Classified = Omit<CustomPart, "key">;

function messageIdOf(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const id = (value as { readonly messageId?: unknown }).messageId;
  return typeof id === "string" ? id : undefined;
}

function blocked(name: string, value: unknown, reason: string, partId?: string): Classified {
  const messageId = messageIdOf(value);
  return {
    name,
    rendering: "blocked",
    value: null,
    blockedReason: reason,
    ...(messageId === undefined ? {} : { messageId }),
    ...(partId === undefined ? {} : { partId }),
  };
}

function classifyMedia(value: unknown, allowedOrigins: readonly string[]): Classified {
  const parsed = KmMediaSchema.safeParse(value);
  if (!parsed.success) return blocked(KM_CUSTOM.media, value, "invalid km.media value");
  const media = parsed.data;
  const verdict = checkMediaUrl(media.url, allowedOrigins);
  if (!verdict.allowed) return blocked(KM_CUSTOM.media, value, verdict.reason, media.mediaId);
  const poster = media.posterUrl === undefined ? null : checkMediaUrl(media.posterUrl, allowedOrigins);
  const { posterUrl: _poster, ...rest } = media;
  const safe: KmMedia = { ...rest, url: verdict.url, ...(poster?.allowed === true ? { posterUrl: poster.url } : {}) };
  return { name: KM_CUSTOM.media, rendering: "renderer", messageId: media.messageId, partId: media.mediaId, value: safe };
}

export function createCustomClassifier(allowedOrigins: readonly string[]): (name: string, value: unknown) => Classified {
  return (name, value) => {
    switch (name) {
      case KM_CUSTOM.citation: {
        const parsed = KmCitationSchema.safeParse(value);
        return parsed.success
          ? { name, rendering: "renderer", messageId: parsed.data.messageId, partId: parsed.data.citationId, value: parsed.data }
          : blocked(name, value, "invalid km.citation value");
      }
      case KM_CUSTOM.media:
        return classifyMedia(value, allowedOrigins);
      case KM_CUSTOM.mermaid: {
        const parsed = KmMermaidSchema.safeParse(value);
        return parsed.success
          ? { name, rendering: "renderer", messageId: parsed.data.messageId, partId: parsed.data.diagramId, value: parsed.data }
          : blocked(name, value, "invalid km.mermaid value");
      }
      default: {
        const messageId = messageIdOf(value);
        return { name, rendering: "fallback", value, ...(messageId === undefined ? {} : { messageId }) };
      }
    }
  };
}
