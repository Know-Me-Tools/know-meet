// TJ-ARCH-MOB-001 compliant
// One recording at `/recordings#recording:<id>` (shape recordings-library.md §2, §4,
// §6-§8, RL-1, RL-6, RL-12): back link, h1 title and the facts line, the condition
// note (stopped early, incomplete, file missing), the player, then Download (an anchor
// on the object URL with the filename) and Delete (confirmed), and the link to the
// meeting in History when one exists. The object URL is opened when the detail opens and
// revoked when it closes (useRecordingPlayback). A missing file offers only Delete.
import { parseMeetingHistoryId } from "@know-meet/domain";
import { buttonVariants } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { Spinner } from "@know-meet/ui/components/spinner";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { useState } from "react";
import {
  type RecordingPlayback,
  useDeleteRecording,
  useRecordingPlayback,
} from "../../../app/recordings/hooks";
import { formatBytes } from "../../workspace/application/format";
import {
  clockTime,
  detailFacts,
  downloadFilename,
  recordedMs,
  recordingTitle,
} from "../application/recording-format";
import { DeleteRecordingDialog } from "./delete-recording-dialog";
import type { LibraryRow } from "./recording-items";
import { ConditionNote } from "./recording-parts";
import { RecordingPlayer } from "./recording-player";

const linkClass = cn(
  "inline-flex min-h-size-target items-center gap-s2 rounded-10 px-s2 text-sm font-semibold text-foreground no-underline",
  focusFillClass,
);

function BackLink() {
  return (
    <Link to="/recordings" className={cn(linkClass, "-ml-s2 mb-s2 w-fit")}>
      <KmIcon name="chevron-right" className="size-4 rotate-180" />
      <span>Recordings</span>
    </Link>
  );
}

function ConditionFor({ row }: { readonly row: LibraryRow }) {
  if (row.state === "stopped-early") {
    const at = row.endedAt === null ? "" : ` at ${clockTime(row.endedAt)}`;
    return (
      <ConditionNote tone="amber">
        Browser storage ran out, so recording stopped{at}. Everything up to then was saved.
      </ConditionNote>
    );
  }
  if (row.state === "incomplete") {
    return (
      <ConditionNote tone="red">
        This recording didn't finish saving. It may stop early or not play. Download it to try
        another player, or delete it.
      </ConditionNote>
    );
  }
  return null;
}

/** The stage area for every playback state but `ready`. */
function StageMessage({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="grid aspect-video place-items-center rounded-lg bg-media-bg p-s5">
      <p className="flex max-w-[44ch] items-start gap-s2 text-sm text-foreground">{children}</p>
    </div>
  );
}

function PlaybackArea({
  playback,
  row,
}: {
  readonly playback: RecordingPlayback;
  readonly row: LibraryRow;
}) {
  switch (playback.status) {
    case "ready": {
      const ms = recordedMs(row);
      return (
        <RecordingPlayer url={playback.url} recordedSeconds={ms === null ? null : ms / 1000} />
      );
    }
    case "idle":
    case "loading":
      return (
        <StageMessage>
          <Spinner aria-hidden="true" role="presentation" className="motion-reduce:animate-none" />
          <span>Opening the recording…</span>
        </StageMessage>
      );
    case "recording":
      return (
        <StageMessage>
          <KmIcon name="record" className="mt-px flex-none text-red-text" />
          <span>
            This recording is still being written in another tab. It can play once it ends.
          </span>
        </StageMessage>
      );
    case "missing":
      return (
        <StageMessage>
          <KmIcon name="alert" className="mt-px flex-none text-red-text" />
          <span>The browser removed this file, so it can't play. Delete the entry to tidy up.</span>
        </StageMessage>
      );
    case "failed":
      return (
        <StageMessage>
          <KmIcon name="alert" className="mt-px flex-none text-red-text" />
          <span>This browser couldn't open the file. Reload the page to try again.</span>
        </StageMessage>
      );
  }
}

function HistoryLink({ meetingId }: { readonly meetingId: string | null }) {
  const id = parseMeetingHistoryId(meetingId);
  if (id === null) return null;
  return (
    <Link to="/history" hash={`meeting:${id}`} className={cn(linkClass, "w-fit")}>
      <KmIcon name="clock" className="size-4" />
      <span>Meeting and chat in History</span>
    </Link>
  );
}

interface RecordingDetailViewProps {
  readonly row: LibraryRow;
  readonly onDeleted: (row: LibraryRow) => void;
}

export function RecordingDetailView({ row, onDeleted }: RecordingDetailViewProps) {
  const playable = row.state !== "missing" && row.state !== "recording";
  const playback = useRecordingPlayback(playable ? row.id : null);
  const remover = useDeleteRecording();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const title = recordingTitle(row);
  const shown: RecordingPlayback = playable
    ? playback
    : { status: row.state === "missing" ? "missing" : "recording" };

  const onConfirm = () => {
    setFailed(false);
    void remover.deleteRecording(row.id).then((removed) => {
      if (!removed) {
        setFailed(true);
        return;
      }
      setDeleted(true);
      setConfirmOpen(false);
      onDeleted(row);
    });
  };

  return (
    <article aria-labelledby="recording-title" className="grid gap-s5">
      <header className="grid gap-s1">
        <BackLink />
        <h1
          id="recording-title"
          tabIndex={-1}
          className="text-2xl outline-none [overflow-wrap:anywhere]"
        >
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{detailFacts(row)}</p>
      </header>
      <ConditionFor row={row} />
      <div className="grid w-full max-w-[960px] gap-s4 max-bp1024:max-w-[720px]">
        <PlaybackArea playback={shown} row={row} />
        <div className="flex flex-wrap gap-s3 max-bp768:grid max-bp768:grid-cols-[minmax(0,1fr)]">
          {playback.status === "ready" ? (
            <a
              href={playback.url}
              download={downloadFilename(row)}
              className={cn(buttonVariants({ variant: "secondary" }), focusFillClass)}
            >
              <KmIcon name="download" />
              <span>Download</span>
            </a>
          ) : null}
          {row.state === "recording" ? null : (
            <DeleteRecordingDialog
              open={confirmOpen}
              onOpenChange={(open) => {
                if (!remover.pending) setConfirmOpen(open);
                if (open) setFailed(false);
              }}
              size={formatBytes(row.sizeBytes)}
              pending={remover.pending}
              failed={failed}
              returnFocus={!deleted}
              onConfirm={onConfirm}
            />
          )}
        </div>
        <HistoryLink meetingId={row.meetingId} />
      </div>
    </article>
  );
}
