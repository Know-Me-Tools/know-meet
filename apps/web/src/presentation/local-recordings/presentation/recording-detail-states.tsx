// TJ-ARCH-MOB-001 compliant
// Detail states with no recording to show (shape recordings-library.md §6): opening
// (the list's first read has not finished) and not found (the id does not parse, or no
// recording with it is on this device, for example after it was deleted in another tab).
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { Spinner } from "@know-meet/ui/components/spinner";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";

const backClass = cn(
  "-ml-s2 inline-flex min-h-size-target w-fit items-center gap-s2 rounded-10 px-s2 text-sm font-semibold text-foreground no-underline",
  focusFillClass,
);

function BackToLibrary() {
  return (
    <Link to="/recordings" className={backClass}>
      <KmIcon name="chevron-right" className="size-4 rotate-180" />
      <span>Recordings</span>
    </Link>
  );
}

export function OpeningView() {
  return (
    <section aria-busy="true" aria-labelledby="recording-opening-h" className="grid gap-s3">
      <BackToLibrary />
      <h1 id="recording-opening-h" tabIndex={-1} className="text-2xl outline-none">
        Recording
      </h1>
      <p className="flex items-center gap-s2 text-sm text-muted-foreground">
        <Spinner aria-hidden="true" role="presentation" className="motion-reduce:animate-none" />
        <span>Opening the recording…</span>
      </p>
    </section>
  );
}

export function NotFoundView() {
  return (
    <section aria-labelledby="recording-missing-h" className="grid gap-s3">
      <BackToLibrary />
      <h1 id="recording-missing-h" tabIndex={-1} className="text-2xl outline-none">
        This recording isn't on this device
      </h1>
      <p className="max-w-measure-empty text-muted-foreground">
        It may have been deleted, or the link came from another browser. Recordings stay in the
        browser that made them.
      </p>
    </section>
  );
}
