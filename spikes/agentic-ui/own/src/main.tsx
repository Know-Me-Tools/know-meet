/** Composition root: reads the launch parameters, wires adapters to ports, installs the probe, renders. */
import "katex/dist/katex.min.css";
import "./styles.css";
import { createRoot } from "react-dom/client";
import { AgentSession } from "./application/agent-session.ts";
import { Announcer } from "./application/announcer.ts";
import { LiveTextBuffer } from "./application/live-text-buffer.ts";
import { A2uiHost } from "./infrastructure/a2ui-host.ts";
import { SseAgUiTransport } from "./infrastructure/agui-sse-transport.ts";
import { createCustomClassifier } from "./infrastructure/custom-chunk-classifier.ts";
import { EntityGraphTranscriptStore } from "./infrastructure/entity-graph-store.ts";
import { browserScheduler, createBrowserPublishClock } from "./infrastructure/browser-clock.ts";
import { readLaunchParams, runEndpoint } from "./infrastructure/launch-params.ts";
import { createKmCatalog } from "./presentation/a2ui/catalog.ts";
import { App } from "./presentation/app.tsx";
import type { MarkdownPolicy } from "./presentation/markdown-policy.ts";
import { createProbe } from "./presentation/probe.ts";
import { SessionProvider, type SessionServices } from "./presentation/session-context.tsx";

const params = readLaunchParams(window.location.search);
const live = new LiveTextBuffer();
const announcer = new Announcer(() => Date.now());
const store = new EntityGraphTranscriptStore();

let session: AgentSession | null = null;
const a2ui = new A2uiHost(createKmCatalog(), (action) => {
  void session?.sendA2uiAction(action);
});
session = new AgentSession({
  threadId: `thread-${params.session}`,
  transport: new SseAgUiTransport(runEndpoint(params)),
  store,
  a2ui,
  scheduler: browserScheduler,
  publishClock: createBrowserPublishClock(),
  live,
  announcer,
  reduceContext: { classifyCustom: createCustomClassifier(params.allowMediaOrigins) },
});

const { probe, markReady } = createProbe(session, a2ui, store);
window.__spike = probe;

const markdownPolicy: MarkdownPolicy = {
  baseOrigin: window.location.origin,
  links: { origins: params.allowLinkOrigins, allowMailto: true },
  mediaOrigins: params.allowMediaOrigins,
};
const services: SessionServices = { session, live, announcer, a2ui, allowMediaOrigins: params.allowMediaOrigins, markdownPolicy };
const root = document.getElementById("root");
if (root === null) throw new Error("#root is missing");
createRoot(root).render(
  <SessionProvider services={services}>
    <App onReady={markReady} />
  </SessionProvider>,
);
