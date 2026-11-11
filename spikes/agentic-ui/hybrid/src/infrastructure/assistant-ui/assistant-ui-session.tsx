/**
 * assistant-ui adapter for the Know Meet `ChatSession` port. The AG-UI runtime
 * (`useAgUiRuntime`) owns live run and session state; this adapter only translates port calls into
 * runtime calls and records the client side of each decision in the session journal.
 */
import { useMemo, useRef, type ReactNode } from "react";
import { AssistantRuntimeProvider, useAui } from "@assistant-ui/react";
import { useAgUiRuntime, useAgUiSendA2uiAction, useAgUiSubmitInterruptResponses } from "@assistant-ui/react-ag-ui";
import type { AbstractAgent } from "@ag-ui/client";
import type { ChatSession } from "../../application/ports.ts";
import type { SessionRecorder } from "../../application/session-recorder.ts";
import { ChatSessionContext } from "../../presentation/session-context.tsx";

interface Props {
  readonly agent: AbstractAgent;
  readonly recorder: SessionRecorder;
  readonly children: ReactNode;
}

export function AssistantUiSession({ agent, recorder, children }: Props) {
  const runtime = useAgUiRuntime({ agent, showThinking: true, onError: () => undefined });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <SessionBridge recorder={recorder}>{children}</SessionBridge>
    </AssistantRuntimeProvider>
  );
}

let userSeq = 0;

function SessionBridge({ recorder, children }: { readonly recorder: SessionRecorder; readonly children: ReactNode }) {
  const aui = useAui();
  const sendA2ui = useAgUiSendA2uiAction();
  const submit = useAgUiSubmitInterruptResponses();
  const submitRef = useRef(submit);
  submitRef.current = submit;
  const session = useMemo<ChatSession>(
    () => ({
      send(text) {
        userSeq += 1;
        recorder.client({ type: "client.user-message", messageId: `km-user-${userSeq}`, text });
        aui.thread().append({ role: "user", content: [{ type: "text", text }] });
      },
      cancel() {
        recorder.client({ type: "client.cancel" });
        aui.thread().cancelRun();
      },
      decide(interruptId, approved, respond) {
        recorder.client({ type: "client.decision", interruptId, approved });
        void (respond === undefined ? submitRef.current([{ interruptId, status: "resolved", payload: { approved } }]) : respond(approved));
      },
      sendA2uiAction(action) {
        sendA2ui({ ...action });
      },
    }),
    [aui, recorder, sendA2ui],
  );
  return <ChatSessionContext value={session}>{children}</ChatSessionContext>;
}
