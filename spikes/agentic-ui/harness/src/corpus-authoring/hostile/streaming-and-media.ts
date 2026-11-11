/** Hostile corpus: incomplete streaming fragments, huge tables, media origins. */
import type { HostileItem } from "../../domain/hostile.ts";
import { KM_CUSTOM } from "../../domain/versions.ts";

const md = (markdown: string, chunking: "words" | "chars" | "lines" = "chars") => ({ kind: "markdown" as const, markdown, chunking });

const HUGE_TABLE_ROWS = 400;

function hugeTable(): string {
  const header = "| # | Speaker | Start | End | Words | Sentiment | Topic | Note |\n|---:|---|---|---|---:|---|---|---|";
  const rows = Array.from({ length: HUGE_TABLE_ROWS }, (_, i) =>
    `| ${i + 1} | P${(i % 7) + 1} | 10:${String(i % 60).padStart(2, "0")} | 10:${String((i + 1) % 60).padStart(2, "0")} | ${(i * 37) % 300} | ${i % 3 === 0 ? "positive" : "neutral"} | topic-${i % 12} | row ${i + 1} **bold** \`code\` |`,
  );
  return `Transcript index:\n\n${header}\n${rows.join("\n")}\n\nEnd of index.`;
}

const media = (mediaId: string, kind: "image" | "video" | "audio", url: string, mimeType: string, label: string) => ({
  kind: "custom" as const,
  markdown: `Attached ${kind}: ${label}.`,
  name: KM_CUSTOM.media,
  value: { messageId: "msg-hostile-1", mediaId, kind, url, mimeType, label },
});

export const STREAMING_AND_MEDIA_ITEMS: readonly HostileItem[] = [
  {
    id: "stream-unclosed-fence",
    category: "streaming-fragment",
    title: "Code fence that never closes",
    delivery: md("Here is the config:\n\n```ts\nexport const room = { name: \"Atlas\", seats: 6 };\nconst unfinished = ["),
    expectedOutcome: "During and after streaming the open fence renders as a code block (incomplete-markdown repair); text after it is not swallowed into prose.",
    assert: { requiredSelectors: [{ selector: "pre code", minCount: 1 }], mustShowText: ["Here is the config:"] },
  },
  {
    id: "stream-partial-table",
    category: "streaming-fragment",
    title: "Table cut off mid-row",
    delivery: md("| Name | Role |\n| --- | --- |\n| Ana | host |\n| Ben | gu"),
    expectedOutcome: "Renders a table with the complete row; the partial row may render as text; no layout explosion.",
    assert: { mustShowText: ["Ana", "host"] },
  },
  {
    id: "stream-unclosed-math",
    category: "streaming-fragment",
    title: "Display math that never closes",
    delivery: md("The estimate:\n\n$$\n\\sum_{i=1}^{n} h_i = "),
    expectedOutcome: "No KaTeX crash; the fragment shows as text or a pending math block; following messages render normally.",
    assert: { mustShowText: ["The estimate:"] },
  },
  {
    id: "stream-split-link-emphasis",
    category: "streaming-fragment",
    title: "Link and emphasis split across single-character deltas",
    delivery: md("Please **review [the summary](https://know-me.tools/meet/notes/7)** today and _confirm_."),
    expectedOutcome: "The final render has bold text containing an anchor with the exact href; intermediate states never create a broken href.",
    assert: { requiredSelectors: [{ selector: "a[href='https://know-me.tools/meet/notes/7']", count: 1 }, { selector: "strong", minCount: 1 }] },
  },
  {
    id: "stream-dangling-html",
    category: "streaming-fragment",
    title: "Dangling HTML open tag at end of stream",
    delivery: md("Status: done <div class=\"x\" onclick=\"__kmXss('stream-dangling-html')\""),
    expectedOutcome: "Rendered as text or dropped; never becomes an element with a handler.",
    assert: { mustShowText: ["Status: done"] },
  },
  {
    id: "huge-table",
    category: "huge-table",
    title: `GFM table with ${HUGE_TABLE_ROWS} rows x 8 columns`,
    delivery: md(hugeTable(), "lines"),
    expectedOutcome: `All ${HUGE_TABLE_ROWS} body rows render; the message completes within budget; long-task time is reported (budget is a measurement, not a hard pass/fail in WebKit).`,
    assert: { requiredSelectors: [{ selector: "table tbody tr", count: HUGE_TABLE_ROWS }], finalizeWithinMs: 15000, maxLongTaskMs: 2000 },
  },
  {
    id: "media-md-image-allowed",
    category: "media-origin",
    title: "Markdown image from the allowed origin (control)",
    delivery: md("![Whiteboard](" + "{{ALLOWED_ORIGIN}}/media/whiteboard.png)", "words"),
    expectedOutcome: "The image renders with alt 'Whiteboard' and is fetched from the allowed origin.",
    assert: { requiredSelectors: [{ selector: "img[alt='Whiteboard']", count: 1 }], allowedMediaRequestsMin: 1 },
  },
  {
    id: "media-md-image-disallowed",
    category: "media-origin",
    title: "Markdown image from a disallowed origin",
    delivery: md("![Pixel]({{EVIL_ORIGIN}}/beacon/md-image.png) and ![ref][p]\n\n[p]: {{EVIL_ORIGIN}}/beacon/md-ref-image.png", "words"),
    expectedOutcome: "No request reaches the evil origin; a blocked placeholder ([data-testid='km-media-blocked']) or the alt text shows instead.",
    assert: {},
  },
  {
    id: "media-raw-video-audio",
    category: "media-origin",
    title: "Raw <video>/<audio>/<source> tags in markdown",
    delivery: md("<video src=\"{{EVIL_ORIGIN}}/beacon/raw-video.mp4\" autoplay></video><audio><source src=\"{{EVIL_ORIGIN}}/beacon/raw-audio.wav\"></audio> text", "words"),
    expectedOutcome: "Raw media tags are stripped (media only via km.media); zero evil requests.",
    assert: { forbiddenSelectors: ["video", "audio", "source"], mustShowText: ["text"] },
  },
  {
    id: "media-custom-image-allowed",
    category: "media-origin",
    title: "km.media image from the allowed origin (control)",
    delivery: media("m-img-ok", "image", "{{ALLOWED_ORIGIN}}/media/whiteboard.png", "image/png", "Whiteboard photo"),
    expectedOutcome: "Renders an img with alt 'Whiteboard photo'.",
    assert: { requiredSelectors: [{ selector: "img[alt='Whiteboard photo']", count: 1 }], allowedMediaRequestsMin: 1 },
  },
  {
    id: "media-custom-video-allowed",
    category: "media-origin",
    title: "km.media video from the allowed origin (control)",
    delivery: media("m-vid-ok", "video", "{{ALLOWED_ORIGIN}}/media/clip.mp4", "video/mp4", "Pricing clip"),
    expectedOutcome: "Renders a video with controls, no autoplay, and an accessible name.",
    assert: { requiredSelectors: [{ selector: "video[controls]:not([autoplay])", count: 1 }] },
  },
  {
    id: "media-custom-audio-disallowed",
    category: "media-origin",
    title: "km.media audio from a disallowed origin",
    delivery: media("m-aud-evil", "audio", "{{EVIL_ORIGIN}}/beacon/custom-audio.wav", "audio/wav", "Voice note"),
    expectedOutcome: "Blocked placeholder; no audio element pointing at the evil origin; zero evil requests.",
    assert: { requiredSelectors: [{ selector: "[data-testid='km-media-blocked']", minCount: 1 }] },
  },
  {
    id: "media-custom-javascript-url",
    category: "media-origin",
    title: "km.media with a javascript: URL",
    delivery: media("m-js", "image", "javascript:__kmXss('media-custom-javascript-url')", "image/png", "Bad image"),
    expectedOutcome: "Rejected (schema or allowlist) and shown as blocked; nothing executes.",
    assert: { requiredSelectors: [{ selector: "[data-testid='km-media-blocked']", minCount: 1 }] },
  },
  {
    id: "media-custom-svg-image",
    category: "media-origin",
    title: "km.media image/svg+xml from the allowed origin containing script",
    delivery: media("m-svg", "image", "{{ALLOWED_ORIGIN}}/media/hostile.svg", "image/svg+xml", "Diagram"),
    expectedOutcome: "If rendered, only via <img> (scripts in SVG-as-image never run); never inlined into the DOM.",
    assert: { forbiddenSelectors: ["svg script"] },
  },
];
