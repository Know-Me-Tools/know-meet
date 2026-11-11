/** CUSTOM events carrying Know Meet chunk types, an unknown CUSTOM name and RAW. */
import type { ScenarioFile } from "../../domain/scenario.ts";
import { KM_CUSTOM } from "../../domain/versions.ts";
import { custom, raw, runFinished, runStarted, textMessage } from "../event-builders.ts";
import { defineScenario, userTurn } from "../scenario-base.ts";

const MSG = "msg-custom-1";

export const CUSTOM_CHUNK_VALUES = {
  citation1: {
    messageId: MSG,
    citationId: "cit-1",
    index: 1,
    title: "Pricing decision notes",
    url: "https://know-me.tools/meet/notes/7",
    snippet: "The team chose usage-based tiers.",
  },
  citation2: { messageId: MSG, citationId: "cit-2", index: 2, title: "Spec 42, risks", url: "https://know-me.tools/docs/spec-42#risks" },
  image: {
    messageId: MSG,
    mediaId: "media-img-1",
    kind: "image",
    url: "{{ALLOWED_ORIGIN}}/media/whiteboard.png",
    mimeType: "image/png",
    label: "Whiteboard photo of the pricing tiers",
  },
  video: {
    messageId: MSG,
    mediaId: "media-vid-1",
    kind: "video",
    url: "{{ALLOWED_ORIGIN}}/media/clip.mp4",
    mimeType: "video/mp4",
    label: "Clip: the pricing discussion",
    posterUrl: "{{ALLOWED_ORIGIN}}/media/poster.png",
  },
  audio: {
    messageId: MSG,
    mediaId: "media-aud-1",
    kind: "audio",
    url: "{{ALLOWED_ORIGIN}}/media/note.wav",
    mimeType: "audio/wav",
    label: "Voice note from Ana",
  },
  mermaid: {
    messageId: MSG,
    diagramId: "dia-1",
    source: "graph TD\n  A[Proposal] --> B{Measured?}\n  B -- yes --> C[Decide]\n  B -- no --> D[Spike]",
  },
} as const;

export function customChunksScenario(): ScenarioFile {
  const prompt = "What did we decide on pricing? Show your sources and the clip.";
  const text = "The team chose usage-based tiers [1], with the risks tracked in the spec [2]. The whiteboard, clip, voice note and decision flow are attached.";
  const v = CUSTOM_CHUNK_VALUES;
  const items = [
    runStarted(),
    ...textMessage(MSG, text),
    custom(KM_CUSTOM.citation, v.citation1),
    custom(KM_CUSTOM.citation, v.citation2),
    custom(KM_CUSTOM.media, v.image),
    custom(KM_CUSTOM.media, v.video),
    custom(KM_CUSTOM.media, v.audio),
    custom(KM_CUSTOM.mermaid, v.mermaid),
    custom("km.future-widget", { messageId: MSG, anything: { nested: true } }),
    raw({ provider: "livekit-agents", kind: "metrics", ttftMs: 412 }, "livekit-agents"),
    runFinished({ type: "success" }),
  ];
  return defineScenario({
    id: "custom-chunks",
    title: "CUSTOM chunk types: km.citation, km.media, km.mermaid, unknown, plus RAW",
    description:
      "CUSTOM events attach parts to message msg-custom-1 (value.messageId). Known names render with their renderer; " +
      "`km.future-widget` must render the neutral fallback (or be listed with rendering \"fallback\") without crashing; " +
      "RAW must not render. Media URLs use {{ALLOWED_ORIGIN}}, which the prototype must allow via the `allowMediaOrigin` query parameter.",
    tags: ["@custom", "@media"],
    userPrompt: prompt,
    runs: [{ trigger: { kind: "initial" }, items }],
    expected: {
      runStatus: "finished",
      noProtocolErrors: true,
      messages: [userTurn(prompt), { id: MSG, role: "assistant", textEquals: text, status: "complete" }],
      customParts: [
        { name: KM_CUSTOM.citation, partId: "cit-1", rendering: "renderer" },
        { name: KM_CUSTOM.citation, partId: "cit-2", rendering: "renderer" },
        { name: KM_CUSTOM.media, partId: "media-img-1", rendering: "renderer" },
        { name: KM_CUSTOM.media, partId: "media-vid-1", rendering: "renderer" },
        { name: KM_CUSTOM.media, partId: "media-aud-1", rendering: "renderer" },
        { name: KM_CUSTOM.mermaid, partId: "dia-1", rendering: "renderer" },
        { name: "km.future-widget", rendering: "fallback" },
      ],
      dom: [
        { selector: "[data-testid='km-custom-part'][data-part-name='km.citation']", count: 2 },
        { selector: "img[alt='Whiteboard photo of the pricing tiers']", count: 1 },
        { selector: "video", count: 1 },
        { selector: "audio", count: 1 },
        { selector: "[data-testid='km-custom-part'][data-part-name='km.mermaid'] svg", minCount: 1 },
        { selector: "[data-testid='km-custom-unknown']", count: 1 },
      ],
    },
  });
}
