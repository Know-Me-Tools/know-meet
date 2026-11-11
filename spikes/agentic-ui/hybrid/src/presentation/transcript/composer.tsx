/**
 * Composer (shadcn AI Elements "Prompt Input" pattern). The input stays enabled while a run
 * streams; only Send is disabled. Stop is shown while running. After sending, focus returns to the
 * input (WebKit drops focus to <body> after a button click).
 */
import { useState, type FormEvent } from "react";
import { useChatSession, useServices, useSessionRead } from "../session-context.tsx";

const selectRunning = (r: { runStatus(): string }) => r.runStatus() === "running";

export function Composer() {
  const session = useChatSession();
  const services = useServices();
  const running = useSessionRead(selectRunning);
  const [draft, setDraft] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim() === "" ? "" : draft;
    if (text === "" || running) return;
    setDraft("");
    session.send(text);
    services.composerRef.current?.focus();
  };

  return (
    <form onSubmit={submit} className="sticky bottom-0 flex items-end gap-s2 rounded-lg bg-surface p-s2" aria-label="Message the assistant">
      <label htmlFor="km-composer" className="sr-only">Message</label>
      <textarea
        id="km-composer"
        ref={(el) => {
          services.composerRef.current = el;
        }}
        data-testid="km-composer-input"
        value={draft}
        rows={1}
        placeholder="Ask about the meeting…"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) submit(e);
        }}
        className="max-h-40 min-h-11 flex-1 resize-none rounded-base bg-bg-2 px-s3 py-s3 text-15 text-fg placeholder:text-fg-sub focus-visible:outline-2 focus-visible:outline-ring"
      />
      {running ? (
        <button type="button" data-testid="km-cancel-run" onClick={() => session.cancel()} className="h-11 rounded-base bg-card px-s4 text-sm font-semibold text-fg hover:bg-card-hov focus-visible:outline-2 focus-visible:outline-ring">
          Stop
        </button>
      ) : null}
      <button type="submit" data-testid="km-composer-submit" disabled={running} className="h-11 rounded-base bg-ember-btn px-s4 text-sm font-semibold text-on-ember hover:bg-ember-btn-hov focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60">
        Send
      </button>
    </form>
  );
}
