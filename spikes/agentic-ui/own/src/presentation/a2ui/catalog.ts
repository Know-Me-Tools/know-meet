/** The Know Meet A2UI catalog: the v1.0 basic catalog's APIs and functions, rendered by our React components, plus KmFallback. */
import type { ReactCatalogComponent } from "@a2ui/react";
import { BASIC_FUNCTIONS, Catalog } from "@a2ui/web_core/v1_0";
import { INPUT_COMPONENTS } from "./catalog-inputs.tsx";
import { LAYOUT_COMPONENTS } from "./catalog-layout.tsx";

export const BASIC_CATALOG_ID = "https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json";

export function createKmCatalog(): Catalog<ReactCatalogComponent> {
  return new Catalog<ReactCatalogComponent>(BASIC_CATALOG_ID, "1.0", [...LAYOUT_COMPONENTS, ...INPUT_COMPONENTS], BASIC_FUNCTIONS);
}
