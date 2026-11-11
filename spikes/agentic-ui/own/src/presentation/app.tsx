/** App shell: transcript, composer (AI Elements "PromptInput" pattern), cancel and the single live region. */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAnnouncement, useServices, useThread } from "./session-context.tsx";
import { Transcript } from "./transcript.tsx";
import { Button } from "./ui/button.tsx";

function Composer() {
  const { session } = useServices();
  const thread = useThread();
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const running = thread.runStatus === "running";
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (running || text.trim() === "") return;
    const prompt = text;
    setText("");
    // Keep typing position in the composer after sending (WebKit drops focus to <body> when a button is clicked).
    inputRef.current?.focus({ preventScroll: true });
    void session.submit(prompt);
  };
  return (
    <form onSubmit={submit} className="flex items-end gap-2 rounded-lg bg-bg-2 p-3" aria-label="Message the Concierge">
      <label htmlFor="km-composer" className="sr-only">
        Message
      </label>
      <input
        id="km-composer"
        ref={inputRef}
        data-testid="km-composer-input"
        type="text"
        autoComplete="off"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ask about this meeting…"
        className="h-10 flex-1 rounded-md bg-surface px-3 text-sm text-fg ring-1 ring-ring-input placeholder:text-fg-sub focus-visible:outline-2 focus-visible:outline-ember"
      />
      <Button type="submit" data-testid="km-composer-submit" disabled={running}>
        Send
      </Button>
      {running ? (
        <Button data-testid="km-cancel-run" variant="secondary" onClick={() => session.cancel()}>
          Stop
        </Button>
      ) : null}
    </form>
  );
}

function LiveRegion() {
  const text = useAnnouncement();
  return (
    <div data-testid="km-live-region" role="status" aria-live="polite" className="sr-only">
      {text}
    </div>
  );
}

export function App({ onReady }: { readonly onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-4 p-4">
      <header className="flex items-baseline justify-between">
        <h1 className="font-display text-lg font-semibold text-fg">Know Meet · Concierge</h1>
        <span className="text-xs text-fg-sub">Prototype O</span>
      </header>
      <main className="flex flex-1 flex-col gap-4">
        <Transcript />
        <Composer />
      </main>
      <LiveRegion />
    </div>
  );
}
