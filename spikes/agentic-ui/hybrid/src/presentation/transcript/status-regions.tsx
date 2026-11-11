/** The single polite live region and the run-error alert (contract.md §4, §6). */
import { useCallback, useSyncExternalStore } from "react";
import { useServices, useSessionRead } from "../session-context.tsx";

export function LiveRegion() {
  const { announcements } = useServices();
  const subscribe = useCallback((notify: () => void) => announcements.subscribe(() => notify()), [announcements]);
  const text = useSyncExternalStore(subscribe, () => announcements.current());
  return (
    <div data-testid="km-live-region" aria-live="polite" className="sr-only">
      {text}
    </div>
  );
}

const selectError = (r: { runError(): { code?: string; message?: string } | null }) => {
  const e = r.runError();
  return e === null ? null : `${e.code ?? ""}|${e.message ?? ""}`;
};

export function RunErrorAlert() {
  const error = useSessionRead(selectError);
  if (error === null) return null;
  const [code, message] = error.split("|");
  return (
    <div role="alert" className="rounded-base bg-red-soft px-s4 py-s3 text-sm text-fg">
      <strong className="font-semibold text-red-text">The assistant stopped with an error{code === "" ? "" : ` (${code})`}.</strong>{" "}
      {message === "" || message === undefined ? "Try again in a moment." : message}
    </div>
  );
}
