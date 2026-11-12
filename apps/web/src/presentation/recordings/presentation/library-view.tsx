// TJ-ARCH-MOB-001 compliant
// `#library` (recordings.library): page head, KnowMe-managed storage strip
// (sample quota), toolbar, then the results as a card grid or a list, with a
// polite result count and a no-match empty state.
import { buttonVariants } from "@know-meet/ui/components/button";
import { cardVariants } from "@know-meet/ui/components/card";
import { Empty, EmptyMedia } from "@know-meet/ui/components/empty";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import {
  PageActions,
  PageEyebrow,
  PageHead,
  PageHeadText,
  PageSub,
  PageTitle,
} from "@know-meet/ui/components/page-head";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { formatBytes, formatDate, formatMinutes } from "../../workspace/application/format";
import type { Recording, Workspace } from "../../workspace/domain/workspace";
import { RECORDING_META } from "../application/recording-fixtures";
import { queryLibrary, storageUsage } from "../application/recordings-model";
import { detailHash } from "../application/recordings-route";
import { type LibraryControls, LibraryToolbar } from "./library-toolbar";
import { IconChip, MeterBar, meterTrackClass, RecordingChips } from "./recording-parts";
import { RecordingPoster } from "./recording-poster";

const INITIAL_CONTROLS: LibraryControls = { q: "", filter: "all", sort: "new", layout: "grid" };

/** Linked cards and rows drop their inner fills while focused (DESIGN.md interactive card). */
const linkFocusClass = cn(
  focusFillClass,
  "focus-visible:**:bg-transparent! focus-visible:**:text-inherit!",
);

function MetaLine({ recording }: { readonly recording: Recording }) {
  return (
    <>
      <span className="whitespace-nowrap">{formatDate(recording.date)}</span>
      {" · "}
      <span className="whitespace-nowrap">{formatMinutes(recording.durationMin)}</span>
      {" · "}
      <span className="whitespace-nowrap">{recording.participants.length} participants</span>
    </>
  );
}

function StorageStrip({ recordings }: { readonly recordings: readonly Recording[] }) {
  const usage = storageUsage(recordings);
  const own = usage.ownBucketCount;
  return (
    <section
      aria-labelledby="st-h"
      className={cn(
        cardVariants({ variant: "panel" }),
        "mb-s6 grid-cols-[minmax(0,1fr)_auto] items-center max-bp768:grid-cols-[minmax(0,1fr)]",
      )}
    >
      <div className="grid min-w-0 gap-s2">
        <div className="flex flex-wrap items-center gap-s2">
          <h2 id="st-h" className="text-base">
            KnowMe-managed storage
          </h2>
          <IconChip icon="info" tone="amber">
            Sample quota
          </IconChip>
        </div>
        <div
          role="img"
          aria-label={`${formatBytes(usage.usedBytes)} used of a ${formatBytes(usage.quotaBytes)} sample quota`}
          className={meterTrackClass}
        >
          <MeterBar percent={usage.percent} />
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="whitespace-nowrap">{formatBytes(usage.usedBytes)} used</span> of{" "}
          <span className="whitespace-nowrap">{formatBytes(usage.quotaBytes)}</span> · illustrative
          sample, not a real plan limit.
          {own > 0
            ? ` ${own}${own === 1 ? " recording is" : " recordings are"} in your own bucket and not counted here.`
            : ""}
        </p>
      </div>
      <Link
        to="/settings"
        hash="storage"
        className={cn(buttonVariants({ variant: "secondary", size: "sm" }), focusFillClass)}
      >
        <span>Manage storage</span>
        <KmIcon name="chevron-right" className="size-4" />
      </Link>
    </section>
  );
}

function RecordingCard({
  workspace,
  recording,
}: {
  readonly workspace: Workspace;
  readonly recording: Recording;
}) {
  const meta = RECORDING_META[recording.id];
  return (
    <li>
      <Link
        to="/recordings"
        hash={detailHash(recording.id)}
        className={cn(cardVariants(), "gap-0 overflow-hidden p-0 max-bp768:p-0", linkFocusClass)}
      >
        <RecordingPoster workspace={workspace} recording={recording} />
        <div className="grid min-w-0 gap-s2 p-s4">
          <h3 className="truncate text-base" title={recording.title}>
            {recording.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            <MetaLine recording={recording} />
          </p>
          {meta?.owner === "shared" ? (
            <p className="truncate text-xs text-muted-foreground">Shared with you by {meta.host}</p>
          ) : null}
          <RecordingChips recording={recording} />
        </div>
      </Link>
    </li>
  );
}

function RecordingRow({
  workspace,
  recording,
}: {
  readonly workspace: Workspace;
  readonly recording: Recording;
}) {
  const meta = RECORDING_META[recording.id];
  return (
    <li>
      <Link
        to="/recordings"
        hash={detailHash(recording.id)}
        className={cn(
          "grid grid-cols-[120px_minmax(0,1fr)_auto] items-center gap-s3 rounded-base bg-surface px-s4 py-s3 text-inherit no-underline shadow-(--shadow-card) transition-colors duration-(--dur-fast) [@media(hover:hover)]:hover:bg-card-hov max-bp768:grid-cols-[88px_minmax(0,1fr)]",
          linkFocusClass,
        )}
      >
        <RecordingPoster workspace={workspace} recording={recording} variant="thumb" />
        <span className="grid min-w-0 gap-0.5">
          <span className="truncate font-semibold" title={recording.title}>
            {recording.title}
          </span>
          <span className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
            <MetaLine recording={recording} />
            {meta?.owner === "shared" ? ` · Shared by ${meta.host}` : ""}
          </span>
        </span>
        <span className="flex flex-wrap items-center justify-end gap-s2 max-bp768:col-span-full max-bp768:justify-start">
          <RecordingChips recording={recording} />
        </span>
      </Link>
    </li>
  );
}

function NoMatch({ onClear }: { readonly onClear: () => void }) {
  return (
    <Empty>
      <EmptyMedia variant="icon">
        <KmIcon name="search" />
      </EmptyMedia>
      <h3 className="text-lg">No recordings match</h3>
      <p className="max-w-measure-empty text-sm text-muted-foreground">
        Try a different title or participant name, or switch the filter back to All.
      </p>
      <button
        type="button"
        onClick={onClear}
        className={cn(buttonVariants({ variant: "secondary", size: "sm" }), focusFillClass)}
      >
        <KmIcon name="x" className="size-4" />
        <span>Clear search and filter</span>
      </button>
    </Empty>
  );
}

export function LibraryView({ workspace }: { readonly workspace: Workspace }) {
  const [controls, setControls] = useState<LibraryControls>(INITIAL_CONTROLS);
  const all = workspace.recordings;
  const list = queryLibrary(all, controls);
  const q = controls.q.trim();
  const count = `${list.length}${list.length === 1 ? " recording" : " recordings"}${q === "" ? "" : ` matching “${q}”`}`;
  return (
    <>
      <PageHead>
        <PageHeadText>
          <PageEyebrow>Library</PageEyebrow>
          <PageTitle>Recordings</PageTitle>
          <PageSub>
            Room Composite recordings of meetings you hosted or joined, with transcripts, summaries
            and where each file is stored.
          </PageSub>
        </PageHeadText>
        <PageActions>
          <Link
            to="/settings"
            hash="storage"
            className={cn(buttonVariants({ variant: "secondary" }), focusFillClass)}
          >
            <KmIcon name="database" />
            <span>Storage settings</span>
          </Link>
          <Link to="/meet" hash="start" className={cn(buttonVariants(), focusFillClass)}>
            <KmIcon name="cam" />
            <span>Start meeting</span>
          </Link>
        </PageActions>
      </PageHead>
      <StorageStrip recordings={all} />
      <section aria-labelledby="res-h">
        <h2 id="res-h" className="sr-only">
          All recordings
        </h2>
        <LibraryToolbar controls={controls} onChange={setControls} />
        <div className="mb-s3 flex flex-wrap items-center justify-between gap-s2">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {count}
          </p>
        </div>
        {list.length === 0 ? (
          <NoMatch onClear={() => setControls({ ...controls, q: "", filter: "all" })} />
        ) : controls.layout === "list" ? (
          <ul className="grid gap-s2">
            {list.map((recording) => (
              <RecordingRow key={recording.id} workspace={workspace} recording={recording} />
            ))}
          </ul>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-s4">
            {list.map((recording) => (
              <RecordingCard key={recording.id} workspace={workspace} recording={recording} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
