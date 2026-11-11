/**
 * Know Meet A2UI catalog: the v1.0 basic catalog's component APIs (schemas, so binding, checks and
 * actions behave per spec) with React implementations themed from the design tokens, plus
 * `KmFallback` for components the catalog does not know.
 */
import type { FC } from "react";
import { z } from "zod";
import { createComponentImplementation, type ReactA2uiComponentProps, type ReactCatalogComponent } from "@a2ui/react";
import { basicCatalog, Catalog, type ComponentApi } from "@a2ui/web_core/v1_0";
import { AudioPlayer, Image, Text, Video } from "./content.tsx";
import { Button, CheckBox, ChoicePicker, TextField } from "./inputs.tsx";
import { Card, Column, Divider, KmFallback, List, Modal, Row, Tabs, type A2uiProps } from "./layout.tsx";
import type { LooseProps } from "./props.ts";

const IMPLEMENTATIONS: Readonly<Record<string, FC<A2uiProps>>> = {
  Column, Row, Card, List, Divider, Tabs, Modal, Text, Image, Video, AudioPlayer, Button, TextField, CheckBox, ChoicePicker,
};

const FALLBACK_API: ComponentApi = {
  name: "KmFallback",
  schema: z.object({ originalType: z.string().optional() }).passthrough(),
};

type LooseImpl = FC<ReactA2uiComponentProps<LooseProps>>;

function implement(api: ComponentApi, view: LooseImpl): ReactCatalogComponent {
  // The binder's prop type is inferred from each zod schema; our views read props defensively.
  return createComponentImplementation(api, view as Parameters<typeof createComponentImplementation<ComponentApi>>[1]);
}

export function createKnowMeetCatalog(): { readonly catalog: Catalog<ReactCatalogComponent>; readonly known: ReadonlySet<string> } {
  const components: ReactCatalogComponent[] = [];
  for (const [name, view] of Object.entries(IMPLEMENTATIONS)) {
    const api = basicCatalog.components.get(name);
    if (api !== undefined) components.push(implement(api, view));
  }
  components.push(implement(FALLBACK_API, KmFallback));
  const catalog = new Catalog<ReactCatalogComponent>(basicCatalog.id, basicCatalog.protocolVersion, components, [...basicCatalog.functions.values()]);
  return { catalog, known: new Set(components.map((c) => c.name)) };
}
