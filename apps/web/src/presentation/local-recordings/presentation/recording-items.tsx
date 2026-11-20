// TJ-ARCH-MOB-001 compliant
// Library entries (shape recordings-library.md §4-§6, RL-2, RL-7, RL-10): the card (the
// whole card links to the detail; one action per card), the compact list row (same
// content, plus Download as a trailing 44px icon link), and the not-focusable card of a
// recording still being written in another tab. Linked cards drop their inner fills
// while focused (DESIGN.md interactive card). Scenario contract: `km-recording-item` on
// each link, with `data-duration-ms` (when known) and `data-size-bytes`. A link is named
// by its visible content (title, facts, chips), so every visible word is in the name
// (SC 2.5.3 Label in Name; WC-13, 2026-11-20).
import { buttonVariants } from "@know-meet/ui/components/button";
import { cardVariants } from "@know-meet/ui/components/card";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { type Recordings, useRecordingPlayback } from "../../../app/recordings/hooks";
import {
  clockTime,
  downloadFilename,
  metaLine,
  recordedMs,
  recordingTitle,
} from "../application/recording-format";
import { recordingDetailHash } from "../application/recordings-route";
import { ChipRow, ConditionChip, FormatChip } from "./recording-parts";
import { RecordingPoster } from "./recording-poster";

export type LibraryRow = Recordings["recordings"][number];

const linkFocusClass = cn(
  focusFillClass,
  "focus-visible:**:bg-transparent! focus-visible:**:text-inherit!",
);

/** The object URL of a playable file for its poster and download; null otherwise. */
function usePosterUrl(row: LibraryRow): string | null {
  const playable = row.state !== "recording" && row.state !== "missing";
  const playback = useRecordingPlayback(playable ? row.id : null);
  return playback.status === "ready" ? playback.url : null;
}

function Facts({ row }: { readonly row: LibraryRow }) {
  return (
    <>
      <span className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
        {metaLine(row)}
      </span>
      <ChipRow>
        <FormatChip mimeType={row.mimeType} />
        <ConditionChip condition={row.state} />
      </ChipRow>
    </>
  );
}

export function RecordingCard({ row }: { readonly row: LibraryRow }) {
  const url = usePosterUrl(row);
  return (
    <li>
      <Link
        to="/recordings"
        hash={recordingDetailHash(row.id)}
        data-testid="km-recording-item"
        data-recording-id={row.id}
        data-size-bytes={row.sizeBytes}
        data-duration-ms={recordedMs(row) ?? undefined}
        className={cn(cardVariants(), "gap-0 overflow-hidden p-0 max-bp768:p-0", linkFocusClass)}
      >
        <RecordingPoster url={url} />
        <span className="grid min-w-0 gap-s2 p-s4">
          <span className="truncate text-base font-semibold" title={recordingTitle(row)}>
            {recordingTitle(row)}
          </span>
          <Facts row={row} />
        </span>
      </Link>
    </li>
  );
}

export function RecordingRow({ row }: { readonly row: LibraryRow }) {
  const url = usePosterUrl(row);
  const title = recordingTitle(row);
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-s2 rounded-base bg-surface pr-s3">
      <Link
        to="/recordings"
        hash={recordingDetailHash(row.id)}
        data-testid="km-recording-item"
        data-recording-id={row.id}
        data-size-bytes={row.sizeBytes}
        data-duration-ms={recordedMs(row) ?? undefined}
        className={cn(
          "grid grid-cols-[120px_minmax(0,1fr)] items-center gap-s3 rounded-base px-s4 py-s3 text-inherit no-underline transition-colors duration-(--dur-fast) [@media(hover:hover)]:hover:bg-card-hov max-bp768:grid-cols-[88px_minmax(0,1fr)]",
          linkFocusClass,
        )}
      >
        <RecordingPoster url={url} variant="thumb" />
        <span className="grid min-w-0 gap-1">
          <span className="truncate font-semibold" title={title}>
            {title}
          </span>
          <Facts row={row} />
        </span>
      </Link>
      {url === null ? null : (
        <a
          href={url}
          download={downloadFilename(row)}
          aria-label={`Download ${title}`}
          className={cn(buttonVariants({ variant: "secondary", size: "icon" }), focusFillClass)}
        >
          <KmIcon name="download" />
        </a>
      )}
    </li>
  );
}

/** RL-7: a recording another tab is writing; no link, no actions, not focusable. */
export function InProgressItem({
  row,
  layout,
}: {
  readonly row: LibraryRow;
  readonly layout: "grid" | "list";
}) {
  const where = row.recordingHere ? "in this tab" : "in another tab";
  const poster = (
    <RecordingPoster url={null} variant={layout === "list" ? "thumb" : "card"}>
      <span className="inline-flex items-center gap-1.5 rounded-pill bg-red-soft px-2.5 py-1 text-xs font-semibold text-foreground">
        <span className="size-size-pip flex-none rounded-round bg-pip-red" />
        Recording now
      </span>
    </RecordingPoster>
  );
  const text = (
    <span className="grid min-w-0 gap-1">
      <span className="truncate font-semibold">{recordingTitle(row)}</span>
      <span className="text-sm text-muted-foreground">
        Started {clockTime(row.startedAt)} {where}
      </span>
      <span className="sr-only">Recording now {where}</span>
    </span>
  );
  return (
    <li
      className={cn(
        "rounded-tile bg-surface",
        layout === "list"
          ? "grid grid-cols-[120px_minmax(0,1fr)] items-center gap-s3 px-s4 py-s3 max-bp768:grid-cols-[88px_minmax(0,1fr)]"
          : "grid overflow-hidden",
      )}
    >
      {poster}
      {layout === "list" ? text : <span className="grid p-s4">{text}</span>}
    </li>
  );
}
