/**
 * Pinned protocol facts the whole harness is versioned against.
 * Verified 2026-11-09 from the installed packages (see README.md "Versions").
 */

/** npm package and version the AG-UI corpus is validated against. */
export const AG_UI_CORE_PACKAGE = "@ag-ui/core@1.0.4";

/** `PROTOCOL_VERSION` exported by @ag-ui/core 1.0.4 (`agui.protocolVersion` in its package.json). */
export const AG_UI_PROTOCOL_VERSION = "1.0";

/** npm package whose zod schemas validate the A2UI corpus. */
export const A2UI_WEB_CORE_PACKAGE = "@a2ui/web_core@0.15.0";

/**
 * A2UI spec version the golden surfaces use. @a2ui/web_core 0.15.0 (the core of
 * @a2ui/react 0.15.0) only accepts the literal "1.0" for v1 messages; a2ui_core
 * 0.5.0 (Dart) normalises "1.0" and "v1.0". See contract.md "A2UI version spelling".
 */
export const A2UI_SPEC_VERSION = "1.0";

/** Catalog the golden surfaces target (A2UI v1.0 basic catalog). */
export const A2UI_BASIC_CATALOG_ID =
  "https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json";

/**
 * AG-UI channel for A2UI: an ACTIVITY_SNAPSHOT / ACTIVITY_DELTA message whose
 * activityType is "a2ui-surface" and whose content is `{ a2ui_operations: [...] }`.
 * This is the channel @assistant-ui/react-ag-ui 0.1.2 reads
 * (A2UI_SURFACE_ACTIVITY_TYPE in its runtime/types.d.ts).
 */
export const A2UI_ACTIVITY_TYPE = "a2ui-surface";
export const A2UI_OPERATIONS_KEY = "a2ui_operations";

/** Harness corpus format version; bump when a scenario's meaning changes. */
export const CORPUS_FORMAT_VERSION = 1;

/** Know Meet CUSTOM event names (AG-UI CUSTOM `name`). */
export const KM_CUSTOM = {
  citation: "km.citation",
  media: "km.media",
  mermaid: "km.mermaid",
} as const;

export type KmCustomName = (typeof KM_CUSTOM)[keyof typeof KM_CUSTOM];
