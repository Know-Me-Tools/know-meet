import { Button } from "@know-meet/ui/components/button";
import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import type {
  LocalTranscriptEntry,
  LocalTranscriptLine,
  LocalTranscriptServices,
} from "../../guest-meeting/local-transcript-services";
import { TimedTranscript } from "../../meeting-room/presentation/local-transcript/timed-transcript";

export function LocalTranscriptLibrary({
  services,
}: {
  readonly services: LocalTranscriptServices;
}) {
  const [entries, setEntries] = useState<readonly LocalTranscriptEntry[] | null>(null);
  const [current, setCurrent] = useState<{
    readonly id: string;
    readonly lines: readonly LocalTranscriptLine[];
  } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const actionInFlight = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const reader = useRef<HTMLHeadingElement>(null);
  const deleteTrigger = useRef<HTMLButtonElement>(null);
  const confirmId = useId();
  const currentId = current?.id;
  const searchLines = useCallback(
    (query: string) =>
      currentId === undefined ? Promise.resolve([]) : services.saved.search(currentId, query),
    [currentId, services],
  );

  useLayoutEffect(() => {
    if (currentId !== undefined) reader.current?.focus();
  }, [currentId]);

  async function perform(action: () => Promise<void>, failure: string) {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setBusy(true);
    setStatus("");
    try {
      await action();
    } catch {
      setStatus(failure);
    } finally {
      actionInFlight.current = false;
      setBusy(false);
    }
  }

  const load = () =>
    perform(async () => {
      setEntries(await services.saved.list());
      heading.current?.focus();
    }, "Local transcripts could not be opened. Check that browser storage is available and try again.");

  const open = (id: string) =>
    perform(async () => {
      const lines = await services.saved.open(id);
      setConfirm(null);
      if (lines.length === 0) {
        setEntries((list) => list?.filter((entry) => entry.id !== id) ?? null);
        setCurrent((entry) => (entry?.id === id ? null : entry));
        setStatus("This transcript is no longer available in this browser.");
        heading.current?.focus();
        return;
      }
      setCurrent({ id, lines });
    }, "The transcript could not be restored.");

  const drop = (id: string) =>
    perform(async () => {
      await services.saved.remove(id);
      setEntries((list) => list?.filter((entry) => entry.id !== id) ?? null);
      setCurrent((entry) => (entry?.id === id ? null : entry));
      setConfirm(null);
      setStatus("Transcript deleted from this browser. Recordings are unchanged.");
      heading.current?.focus();
    }, "Deletion could not be confirmed. Reopen the library and try again if it is still listed.");

  return (
    <section
      aria-label="Browser-local transcripts"
      className="mx-auto grid w-full max-w-[760px] min-w-0 gap-s3 rounded-base bg-surface p-s4 text-left"
    >
      <h2
        ref={heading}
        tabIndex={-1}
        className="w-fit rounded-base text-base font-semibold focus:bg-focus focus:text-on-focus"
      >
        Transcripts saved in this browser
      </h2>
      <p className="text-sm">
        Only the current browser profile can open these. Anyone sharing that profile may be able to
        see them.
      </p>
      {entries === null ? (
        <Button
          disabled={busy}
          onClick={() => {
            void load();
          }}
        >
          Open local transcripts
        </Button>
      ) : entries.length === 0 ? (
        <p>No transcripts saved here.</p>
      ) : (
        <ul className="grid gap-s3" aria-busy={busy}>
          {entries.map((entry) => (
            <li key={entry.id} className="grid min-w-0 gap-s2 rounded-base bg-card p-s3">
              <p className="text-sm">
                <strong>{entry.label}</strong> ·{" "}
                <time dateTime={entry.savedAt}>{new Date(entry.savedAt).toLocaleString()}</time>
                {entry.incomplete ? " · Incomplete" : ""}
              </p>
              <div className="flex flex-wrap gap-s2">
                <Button
                  disabled={busy}
                  variant="secondary"
                  onClick={() => {
                    void open(entry.id);
                  }}
                >
                  Open transcript
                </Button>
                <Button
                  disabled={busy}
                  variant="secondary"
                  aria-expanded={confirm === entry.id}
                  aria-controls={confirm === entry.id ? confirmId : undefined}
                  onClick={(event) => {
                    deleteTrigger.current = event.currentTarget;
                    setConfirm(entry.id);
                  }}
                >
                  Delete transcript
                </Button>
              </div>
              {confirm === entry.id ? (
                <div id={confirmId} className="grid gap-s2">
                  <p>
                    Delete this transcript and its search entries? This does not delete the meeting
                    or any recordings.
                  </p>
                  <div className="flex flex-wrap gap-s2">
                    <Button
                      disabled={busy}
                      variant="secondary"
                      onClick={() => {
                        setConfirm(null);
                        deleteTrigger.current?.focus();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      disabled={busy}
                      variant="destructive"
                      onClick={() => {
                        void drop(entry.id);
                      }}
                    >
                      Delete from this browser
                    </Button>
                  </div>
                </div>
              ) : null}
              {current?.id === entry.id ? (
                <>
                  <h3
                    ref={reader}
                    tabIndex={-1}
                    className="w-fit rounded-base text-sm font-semibold focus:bg-focus focus:text-on-focus"
                  >
                    Saved transcript
                  </h3>
                  <TimedTranscript key={entry.id} lines={current.lines} searchLines={searchLines} />
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <p className={status === "" ? "sr-only" : "text-sm"} role="status">
        {status}
      </p>
    </section>
  );
}
