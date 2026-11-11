/** A2UI golden surfaces: lists, cards, media, nesting and the unknown-component fallback. */
import type { GoldenSurfaceFile } from "../../domain/a2ui-surface.ts";
import { defineSurface, op } from "./surface-base.ts";

export function listTemplateSurface(): GoldenSurfaceFile {
  const s = "km-attendees";
  return defineSurface({
    id: "list-template",
    title: "Template list bound to a data-model array",
    description: "A List whose children come from a template over /attendees; the data model then grows by one item.",
    surfaceId: s,
    messages: [
      op.create(s),
      op.components(s, [
        { id: "root", component: "Card", child: "col" },
        { id: "col", component: "Column", children: ["heading", "people"], align: "stretch" },
        { id: "heading", component: "Text", text: "Attendees" },
        { id: "people", component: "List", children: { componentId: "person_row", path: "/attendees" } },
        { id: "person_row", component: "Row", children: ["person_name", "person_role"] },
        { id: "person_name", component: "Text", text: { "@path": "name" } },
        { id: "person_role", component: "Text", text: { "@path": "role" } },
      ]),
      op.data(s, "/attendees", [{ name: "Ana", role: "host" }, { name: "Ben", role: "guest" }]),
      op.data(s, "/attendees/2", { name: "Concierge", role: "agent" }),
    ],
    interactions: [],
    expected: {
      renderedComponentIds: ["root", "col", "heading", "people"],
      fallbackComponentIds: [],
      visibleText: ["Attendees", "Ana", "host", "Ben", "guest", "Concierge", "agent"],
      blockedMediaUrls: [],
      dataModel: { attendees: [{ name: "Ana", role: "host" }, { name: "Ben", role: "guest" }, { name: "Concierge", role: "agent" }] },
    },
    flutterNotes: "Template instances have no stable component id of their own; compare the three rendered rows by text, in order.",
  });
}

export function cardWithActionSurface(): GoldenSurfaceFile {
  const s = "km-agent-card";
  return defineSurface({
    id: "card-with-action",
    title: "Agent card with image, text and an action",
    description: "Card > Column with an Image from the allowed origin, title, description, Divider and a primary Button.",
    surfaceId: s,
    messages: [
      op.create(s, { agent: { id: "scribe", name: "Scribe", blurb: "Takes notes and writes the summary." } }),
      op.components(s, [
        { id: "root", component: "Card", child: "col" },
        { id: "col", component: "Column", children: ["avatar", "name", "blurb", "rule", "add_btn"] },
        { id: "avatar", component: "Image", url: "{{ALLOWED_ORIGIN}}/media/avatar.png", description: "Scribe avatar", variant: "avatar" },
        { id: "name", component: "Text", text: { "@path": "/agent/name" } },
        { id: "blurb", component: "Text", text: { "@path": "/agent/blurb" } },
        { id: "rule", component: "Divider" },
        { id: "add_btn", component: "Button", child: "add_label", variant: "primary", action: { event: { name: "add_agent", context: { agentId: { "@path": "/agent/id" } } } } },
        { id: "add_label", component: "Text", text: "Add to meeting" },
      ]),
    ],
    interactions: [{ description: "Add the agent", click: "add_btn", expectAction: { name: "add_agent", sourceComponentId: "add_btn", context: { agentId: "scribe" } } }],
    expected: {
      renderedComponentIds: ["root", "col", "avatar", "name", "blurb", "rule", "add_btn", "add_label"],
      fallbackComponentIds: [],
      visibleText: ["Scribe", "Takes notes and writes the summary.", "Add to meeting"],
      blockedMediaUrls: [],
    },
    flutterNotes: "Image loads over HTTP from the harness media origin; on device use the host LAN address in place of 127.0.0.1.",
  });
}

export function mediaSurface(): GoldenSurfaceFile {
  const s = "km-recording-media";
  return defineSurface({
    id: "media-image-video-audio",
    title: "Image, Video and AudioPlayer from allowed and disallowed origins",
    description: "Allowed-origin media must render; the image from {{EVIL_ORIGIN}} must be blocked (never requested) and shown as a blocked placeholder.",
    surfaceId: s,
    messages: [
      op.create(s),
      op.components(s, [
        { id: "root", component: "Column", children: ["still", "clip", "voice", "tracker"] },
        { id: "still", component: "Image", url: "{{ALLOWED_ORIGIN}}/media/whiteboard.png", description: "Whiteboard" },
        { id: "clip", component: "Video", url: "{{ALLOWED_ORIGIN}}/media/clip.mp4", posterUrl: "{{ALLOWED_ORIGIN}}/media/poster.png" },
        { id: "voice", component: "AudioPlayer", url: "{{ALLOWED_ORIGIN}}/media/note.wav", description: "Voice note" },
        { id: "tracker", component: "Image", url: "{{EVIL_ORIGIN}}/beacon/a2ui-image.png", description: "Tracking pixel" },
      ]),
    ],
    interactions: [],
    expected: {
      renderedComponentIds: ["root", "still", "clip", "voice", "tracker"],
      fallbackComponentIds: [],
      visibleText: [],
      blockedMediaUrls: ["{{EVIL_ORIGIN}}/beacon/a2ui-image.png"],
    },
    flutterNotes: "a2ui_flutter uses video_player for Video; record whether an origin allowlist hook exists. If not, parity fails on 'tracker'.",
  });
}

export function nestedLayoutSurface(): GoldenSurfaceFile {
  const s = "km-agenda-board";
  return defineSurface({
    id: "nested-layout",
    title: "Deeply nested layout: Tabs > Row > Column > Card, plus a Modal",
    description: "Exercises child resolution across Tabs, Row, Column, Card and Modal (trigger/content) at depth 6.",
    surfaceId: s,
    messages: [
      op.create(s),
      op.components(s, [
        { id: "root", component: "Tabs", tabs: [{ title: "Agenda", child: "agenda_row" }, { title: "Notes", child: "notes_col" }] },
        { id: "agenda_row", component: "Row", children: ["left_col", "right_col"], align: "start" },
        { id: "left_col", component: "Column", children: ["item_card_1", "item_card_2"] },
        { id: "item_card_1", component: "Card", child: "item_1" },
        { id: "item_1", component: "Text", text: "1. Pricing" },
        { id: "item_card_2", component: "Card", child: "item_2" },
        { id: "item_2", component: "Text", text: "2. Roadmap" },
        { id: "right_col", component: "Column", children: ["details_modal"] },
        { id: "details_modal", component: "Modal", trigger: "modal_trigger", content: "modal_body" },
        { id: "modal_trigger", component: "Button", child: "modal_trigger_label", action: { event: { name: "noop_open", context: {} } } },
        { id: "modal_trigger_label", component: "Text", text: "Details" },
        { id: "modal_body", component: "Text", text: "Decided: usage-based tiers." },
        { id: "notes_col", component: "Column", children: ["note_1"] },
        { id: "note_1", component: "Text", text: "Notes tab content" },
      ]),
    ],
    interactions: [],
    expected: {
      renderedComponentIds: ["root", "agenda_row", "left_col", "item_card_1", "item_1", "item_card_2", "item_2", "right_col", "details_modal", "modal_trigger", "modal_trigger_label"],
      fallbackComponentIds: [],
      visibleText: ["Agenda", "Notes", "1. Pricing", "2. Roadmap", "Details"],
      blockedMediaUrls: [],
    },
    flutterNotes: "Inactive tab content (notes_col) and the closed modal body are not required to be in the tree; compare only the listed ids.",
  });
}

export function unknownComponentSurface(): GoldenSurfaceFile {
  const s = "km-future-widget";
  return defineSurface({
    id: "unknown-component-fallback",
    title: "Unknown component type degrades to a fallback",
    description: "One component uses a type absent from the basic catalog. Siblings must still render; the unknown one shows the neutral fallback.",
    surfaceId: s,
    validation: { mode: "strict-fail-expected", errorIncludes: ["KmHologram"] },
    messages: [
      op.create(s),
      op.components(s, [
        { id: "root", component: "Column", children: ["before", "hologram", "after"] },
        { id: "before", component: "Text", text: "Before the unknown widget" },
        { id: "hologram", component: "KmHologram", intensity: 11 },
        { id: "after", component: "Text", text: "After the unknown widget" },
      ]),
    ],
    interactions: [],
    expected: {
      renderedComponentIds: ["root", "before", "hologram", "after"],
      fallbackComponentIds: ["hologram"],
      visibleText: ["Before the unknown widget", "After the unknown widget"],
      blockedMediaUrls: [],
    },
    flutterNotes: "Renderers that reject the whole updateComponents message on an unknown type fail this surface; record the observed behaviour.",
  });
}
