/**
 * A2UI v1.0 basic-catalog layout and display components rendered with React
 * and the copied shadcn patterns. Every component's root carries
 * data-a2ui-id; media obeys the allowMediaOrigin allowlist.
 */
import { createComponentImplementation, type ReactComponentImplementation } from "@a2ui/react";
import {
  AudioPlayerApi,
  CardApi,
  ColumnApi,
  DividerApi,
  IconApi,
  ImageApi,
  ListApi,
  ModalApi,
  RowApi,
  TabsApi,
  TextApi,
  VideoApi,
} from "@a2ui/web_core/v1_0";
import { useState } from "react";
import { z } from "zod";
import { checkMediaUrl } from "../../domain/media-policy.ts";
import { Card } from "../ui/card.tsx";
import { cn } from "../ui/cn.ts";
import { renderChildren, useSurfaceUi, type ChildRef } from "./surface-ui.tsx";

const TEXT_CLASS: Readonly<Record<string, string>> = {
  h1: "font-display text-xl font-semibold",
  h2: "font-display text-lg font-semibold",
  h3: "font-display text-15 font-semibold",
  h4: "text-sm font-semibold",
  h5: "text-13 font-semibold",
  caption: "text-xs text-fg-sub",
};

const JUSTIFY: Readonly<Record<string, string>> = { start: "justify-start", center: "justify-center", end: "justify-end", spaceBetween: "justify-between" };
const ALIGN: Readonly<Record<string, string>> = { start: "items-start", center: "items-center", end: "items-end", stretch: "items-stretch" };

function str(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

const Text = createComponentImplementation(TextApi, ({ props, context }) => (
  <p data-a2ui-id={context.componentModel.id} className={cn("text-sm text-fg", TEXT_CLASS[str(props.variant)])}>
    {str(props.text)}
  </p>
));

function Blocked({ id, label }: { readonly id: string; readonly label: string }) {
  return (
    <div data-a2ui-id={id} data-testid="km-media-blocked" className="km-blocked">
      Media blocked: {label}
    </div>
  );
}

const Image = createComponentImplementation(ImageApi, ({ props, context }) => {
  const { allowMediaOrigins } = useSurfaceUi();
  const id = context.componentModel.id;
  const verdict = checkMediaUrl(props.url, allowMediaOrigins);
  const label = str(props.description);
  if (!verdict.allowed) return <Blocked id={id} label={label || "image"} />;
  return <img data-a2ui-id={id} src={verdict.url} alt={label} loading="lazy" className="km-media" />;
});

const Video = createComponentImplementation(VideoApi, ({ props, context }) => {
  const { allowMediaOrigins } = useSurfaceUi();
  const id = context.componentModel.id;
  const verdict = checkMediaUrl(props.url, allowMediaOrigins);
  if (!verdict.allowed) return <Blocked id={id} label="video" />;
  const poster = checkMediaUrl(props.posterUrl, allowMediaOrigins);
  return <video data-a2ui-id={id} src={verdict.url} controls preload="metadata" aria-label="Video" className="km-media" {...(poster.allowed ? { poster: poster.url } : {})} />;
});

const AudioPlayer = createComponentImplementation(AudioPlayerApi, ({ props, context }) => {
  const { allowMediaOrigins } = useSurfaceUi();
  const id = context.componentModel.id;
  const verdict = checkMediaUrl(props.url, allowMediaOrigins);
  const label = str(props.description) || "Audio";
  if (!verdict.allowed) return <Blocked id={id} label={label} />;
  return <audio data-a2ui-id={id} src={verdict.url} controls preload="metadata" aria-label={label} />;
});

const Icon = createComponentImplementation(IconApi, ({ props, context }) => (
  <span data-a2ui-id={context.componentModel.id} aria-hidden="true" className="text-fg-sub">
    {typeof props.name === "string" ? `[${props.name}]` : "•"}
  </span>
));

const Row = createComponentImplementation(RowApi, ({ props, context, buildChild }) => (
  <div data-a2ui-id={context.componentModel.id} className={cn("flex flex-row flex-wrap gap-3", JUSTIFY[str(props.justify)], ALIGN[str(props.align)])}>
    {renderChildren(props.children as readonly ChildRef[] | undefined, buildChild)}
  </div>
));

const Column = createComponentImplementation(ColumnApi, ({ props, context, buildChild }) => (
  <div data-a2ui-id={context.componentModel.id} className={cn("flex flex-col gap-3", JUSTIFY[str(props.justify)], ALIGN[str(props.align)])}>
    {renderChildren(props.children as readonly ChildRef[] | undefined, buildChild)}
  </div>
));

const List = createComponentImplementation(ListApi, ({ props, context, buildChild }) => (
  <div data-a2ui-id={context.componentModel.id} role="list" className={cn("flex gap-2", props.direction === "horizontal" ? "flex-row" : "flex-col")}>
    {renderChildren(props.children as readonly ChildRef[] | undefined, buildChild).map((node, i) => (
      <div role="listitem" key={i}>
        {node}
      </div>
    ))}
  </div>
));

const CardImpl = createComponentImplementation(CardApi, ({ props, context, buildChild }) => (
  <Card data-a2ui-id={context.componentModel.id} className="bg-surface">
    {typeof props.child === "string" ? buildChild(props.child) : null}
  </Card>
));

const Divider = createComponentImplementation(DividerApi, ({ context }) => (
  <hr data-a2ui-id={context.componentModel.id} className="my-1 h-px border-0 bg-muted" />
));

const Tabs = createComponentImplementation(TabsApi, ({ props, context, buildChild }) => {
  const ui = useSurfaceUi();
  const [active, setActive] = useState(0);
  const id = context.componentModel.id;
  const tabs = Array.isArray(props.tabs) ? props.tabs : [];
  const current = tabs[active];
  return (
    <div data-a2ui-id={id} className="flex flex-col gap-3">
      <div role="tablist" className="flex gap-1">
        {tabs.map((tab, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === active}
            className={cn("rounded-pill px-3 py-1 text-13", i === active ? "bg-muted text-fg" : "text-fg-sub hover:bg-card-hov")}
            onClick={() => {
              setActive(i);
              ui.setActiveTab(id, i);
            }}
          >
            {str(tab.title)}
          </button>
        ))}
      </div>
      <div role="tabpanel">{current !== undefined && typeof current.child === "string" ? buildChild(current.child) : null}</div>
    </div>
  );
});

const Modal = createComponentImplementation(ModalApi, ({ props, context, buildChild }) => {
  const ui = useSurfaceUi();
  const [open, setOpen] = useState(false);
  const id = context.componentModel.id;
  const toggle = (next: boolean): void => {
    setOpen(next);
    ui.setModalOpen(id, next);
  };
  return (
    <div data-a2ui-id={id}>
      <div onClickCapture={() => toggle(true)}>{typeof props.trigger === "string" ? buildChild(props.trigger) : null}</div>
      {open ? (
        <div role="dialog" aria-modal="false" aria-label="Details" className="mt-2 rounded-lg bg-bg-2 p-3">
          {typeof props.content === "string" ? buildChild(props.content) : null}
          <button type="button" className="mt-2 text-13 text-fg-sub underline" onClick={() => toggle(false)}>
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
});

export const KmFallbackApi = { name: "KmFallback", schema: z.object({ originalType: z.string().optional() }) };

const Fallback = createComponentImplementation(KmFallbackApi, ({ props, context }) => (
  <div data-a2ui-id={context.componentModel.id} data-a2ui-fallback={props.originalType ?? "unknown"} className="km-blocked">
    This content ({props.originalType ?? "unknown component"}) is not supported here.
  </div>
));

export const LAYOUT_COMPONENTS: readonly ReactComponentImplementation[] = [Text, Image, Icon, Video, AudioPlayer, Row, Column, List, CardImpl, Tabs, Modal, Divider, Fallback];
