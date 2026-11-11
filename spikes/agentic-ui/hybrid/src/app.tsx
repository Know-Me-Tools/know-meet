/** Root component: provides the presentation services and mounts the assistant-ui session. */
import { useEffect, useMemo } from "react";
import type { App as Composed } from "./composition.ts";
import { AssistantUiSession } from "./infrastructure/assistant-ui/assistant-ui-session.tsx";
import { TranscriptView } from "./infrastructure/assistant-ui/transcript-view.tsx";
import { SessionServicesContext, useChatSession, type SessionServices } from "./presentation/session-context.tsx";

function A2uiActionBridge({ app }: { readonly app: Composed }) {
  const session = useChatSession();
  useEffect(() => app.a2ui.setActionSink((action) => session.sendA2uiAction(action)), [app, session]);
  return null;
}

function ReadyFlag({ app }: { readonly app: Composed }) {
  useEffect(() => {
    app.probe.ready = true;
  }, [app]);
  return null;
}

export function App({ app }: { readonly app: Composed }) {
  const services = useMemo<SessionServices>(
    () => ({
      read: app.store,
      announcements: app.recorder.announcer,
      surfaces: app.a2ui,
      allowedMediaOrigins: app.params.allowMediaOrigins,
      renders: app.renders,
      composerRef: { current: null },
    }),
    [app],
  );
  return (
    <SessionServicesContext value={services}>
      <AssistantUiSession agent={app.agent} recorder={app.recorder}>
        <A2uiActionBridge app={app} />
        <TranscriptView />
        <ReadyFlag app={app} />
      </AssistantUiSession>
    </SessionServicesContext>
  );
}
