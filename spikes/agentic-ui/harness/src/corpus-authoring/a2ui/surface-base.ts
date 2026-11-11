/** Helpers for authoring A2UI v1.0 golden surfaces. */
import type { GoldenSurfaceFile } from "../../domain/a2ui-surface.ts";
import { A2UI_BASIC_CATALOG_ID, A2UI_SPEC_VERSION, A2UI_WEB_CORE_PACKAGE, CORPUS_FORMAT_VERSION } from "../../domain/versions.ts";

type A2uiMessage = Readonly<Record<string, unknown>>;
type Component = Readonly<Record<string, unknown>>;

const V = A2UI_SPEC_VERSION;

export const op = {
  create(surfaceId: string, dataModel?: Record<string, unknown>, sendDataModel?: boolean): A2uiMessage {
    return {
      version: V,
      createSurface: {
        surfaceId,
        catalogId: A2UI_BASIC_CATALOG_ID,
        ...(dataModel === undefined ? {} : { dataModel }),
        ...(sendDataModel === undefined ? {} : { sendDataModel }),
      },
    };
  },
  components(surfaceId: string, components: readonly Component[]): A2uiMessage {
    return { version: V, updateComponents: { surfaceId, components } };
  },
  data(surfaceId: string, path: string, value: unknown): A2uiMessage {
    return { version: V, updateDataModel: { surfaceId, path, value } };
  },
  remove(surfaceId: string): A2uiMessage {
    return { version: V, deleteSurface: { surfaceId } };
  },
};

type SurfaceInput = Omit<GoldenSurfaceFile, "corpusFormatVersion" | "a2uiSpecVersion" | "a2uiWebCorePackage" | "catalogId" | "validation"> &
  Partial<Pick<GoldenSurfaceFile, "validation">>;

export function defineSurface(input: SurfaceInput): GoldenSurfaceFile {
  return {
    corpusFormatVersion: CORPUS_FORMAT_VERSION,
    a2uiSpecVersion: V,
    a2uiWebCorePackage: A2UI_WEB_CORE_PACKAGE,
    catalogId: A2UI_BASIC_CATALOG_ID,
    validation: { mode: "strict-pass" },
    ...input,
  };
}
