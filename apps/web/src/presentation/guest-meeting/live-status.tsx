// TJ-ARCH-MOB-001 compliant
// web-release-acceptance.md 5.3: one polite status region per screen, rendered empty at
// mount and reused (stable region, then a text update). Announcing the same text twice
// clears the region first so screen readers read it again.
import { useCallback, useEffect, useRef, useState } from "react";

export type Announce = (message: string) => void;

export function useAnnouncer(): { readonly message: string; readonly announce: Announce } {
  const [message, setMessage] = useState("");
  const frame = useRef(0);
  useEffect(() => () => window.cancelAnimationFrame(frame.current), []);
  const announce = useCallback<Announce>((next) => {
    window.cancelAnimationFrame(frame.current);
    setMessage("");
    frame.current = window.requestAnimationFrame(() => setMessage(next));
  }, []);
  return { message, announce };
}

export function LiveStatus({ message }: { readonly message: string }) {
  return (
    <div role="status" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
