/**
 * Know Meet CUSTOM chunk values (km.citation, km.media, km.mermaid) and how each renders.
 * Hand-written guards rather than zod: the harness schemas are zod 4 and the A2UI stack pins zod 3,
 * so the prototype keeps its own copy of the shape (types mirror harness src/domain/custom-chunks.ts).
 */
import { isAllowedMediaUrl } from "./url-policy.ts";

export const KM_CITATION = "km.citation";
export const KM_MEDIA = "km.media";
export const KM_MERMAID = "km.mermaid";

export interface KmCitation {
  readonly messageId: string;
  readonly citationId: string;
  readonly index: number;
  readonly title: string;
  readonly url: string;
  readonly snippet?: string;
}

export interface KmMedia {
  readonly messageId: string;
  readonly mediaId: string;
  readonly kind: "image" | "video" | "audio";
  readonly url: string;
  readonly mimeType: string;
  readonly label: string;
  readonly posterUrl?: string;
}

export interface KmMermaid {
  readonly messageId: string;
  readonly diagramId: string;
  readonly source: string;
}

export type KmCustomPart =
  | { readonly kind: "citation"; readonly value: KmCitation }
  | { readonly kind: "media"; readonly value: KmMedia }
  | { readonly kind: "mermaid"; readonly value: KmMermaid }
  | { readonly kind: "unknown"; readonly name: string; readonly messageId?: string };

export type CustomRendering = "renderer" | "fallback" | "blocked";

type Fields = Readonly<Record<string, unknown>>;

function isFields(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: Fields, key: string): string | undefined {
  const v = value[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function parseCitation(v: Fields): KmCitation | null {
  const messageId = str(v, "messageId");
  const citationId = str(v, "citationId");
  const title = str(v, "title");
  const url = str(v, "url");
  const index = v["index"];
  if (messageId === undefined || citationId === undefined || title === undefined || url === undefined) return null;
  if (typeof index !== "number" || !Number.isInteger(index) || index < 1) return null;
  const snippet = str(v, "snippet");
  return { messageId, citationId, index, title, url, ...(snippet === undefined ? {} : { snippet }) };
}

function parseMedia(v: Fields): KmMedia | null {
  const messageId = str(v, "messageId");
  const mediaId = str(v, "mediaId");
  const kind = v["kind"];
  const url = str(v, "url");
  const mimeType = str(v, "mimeType");
  const label = str(v, "label");
  if (messageId === undefined || mediaId === undefined || url === undefined || mimeType === undefined || label === undefined) return null;
  if (kind !== "image" && kind !== "video" && kind !== "audio") return null;
  const posterUrl = str(v, "posterUrl");
  return { messageId, mediaId, kind, url, mimeType, label, ...(posterUrl === undefined ? {} : { posterUrl }) };
}

function parseMermaid(v: Fields): KmMermaid | null {
  const messageId = str(v, "messageId");
  const diagramId = str(v, "diagramId");
  const source = str(v, "source");
  if (messageId === undefined || diagramId === undefined || source === undefined) return null;
  return { messageId, diagramId, source };
}

/** Returns null for CUSTOM names Know Meet does not own (not `km.*`): those never render. */
export function parseKmCustom(name: string, value: unknown): KmCustomPart | null {
  if (!name.startsWith("km.")) return null;
  const fields = isFields(value) ? value : {};
  const messageId = str(fields, "messageId");
  const unknown: KmCustomPart = { kind: "unknown", name, ...(messageId === undefined ? {} : { messageId }) };
  if (name === KM_CITATION) {
    const c = parseCitation(fields);
    return c === null ? unknown : { kind: "citation", value: c };
  }
  if (name === KM_MEDIA) {
    const m = parseMedia(fields);
    return m === null ? unknown : { kind: "media", value: m };
  }
  if (name === KM_MERMAID) {
    const d = parseMermaid(fields);
    return d === null ? unknown : { kind: "mermaid", value: d };
  }
  return unknown;
}

export function customRendering(part: KmCustomPart, allowedMediaOrigins: readonly string[]): CustomRendering {
  if (part.kind === "unknown") return "fallback";
  if (part.kind === "media") return isAllowedMediaUrl(part.value.url, allowedMediaOrigins) ? "renderer" : "blocked";
  return "renderer";
}

export function customPartId(part: KmCustomPart): string | undefined {
  switch (part.kind) {
    case "citation":
      return part.value.citationId;
    case "media":
      return part.value.mediaId;
    case "mermaid":
      return part.value.diagramId;
    case "unknown":
      return undefined;
  }
}

export function customMessageId(part: KmCustomPart): string | undefined {
  return part.kind === "unknown" ? part.messageId : part.value.messageId;
}
