/**
 * Know Meet CUSTOM chunk value schemas (AG-UI CUSTOM `value`).
 * The prototypes must render these; unknown `km.*` names get the neutral fallback.
 */
import { z } from "zod";
import { KM_CUSTOM } from "./versions.ts";

export const KmCitationValueSchema = z.strictObject({
  messageId: z.string().min(1),
  citationId: z.string().min(1),
  /** 1-based index shown in the superscript marker. */
  index: z.number().int().positive(),
  title: z.string().min(1),
  url: z.url(),
  snippet: z.string().optional(),
});

export const KmMediaValueSchema = z.strictObject({
  messageId: z.string().min(1),
  mediaId: z.string().min(1),
  kind: z.enum(["image", "video", "audio"]),
  url: z.url(),
  mimeType: z.string().min(1),
  /** Accessible name: alt text for images, title for video/audio. */
  label: z.string().min(1),
  posterUrl: z.url().optional(),
});

export const KmMermaidValueSchema = z.strictObject({
  messageId: z.string().min(1),
  diagramId: z.string().min(1),
  source: z.string().min(1),
});

export type KmCitationValue = z.infer<typeof KmCitationValueSchema>;
export type KmMediaValue = z.infer<typeof KmMediaValueSchema>;
export type KmMermaidValue = z.infer<typeof KmMermaidValueSchema>;

export const KM_CUSTOM_SCHEMAS = {
  [KM_CUSTOM.citation]: KmCitationValueSchema,
  [KM_CUSTOM.media]: KmMediaValueSchema,
  [KM_CUSTOM.mermaid]: KmMermaidValueSchema,
} as const;

export function isKnownKmCustom(name: string): name is keyof typeof KM_CUSTOM_SCHEMAS {
  return Object.hasOwn(KM_CUSTOM_SCHEMAS, name);
}
