// TJ-ARCH-MOB-001 compliant
// The library (shape recordings-library.md §2, §4, §6, RL-1, RL-4): the signed-in
// library's grammar without its cloud parts. Page head (eyebrow "On this device", h1
// "Recordings"), the Browser storage strip, then the toolbar (labelled Sort select and
// the Grid/List toggle group, whose pressed item carries a check) and the recordings as
// cards or rows, newest first. A recording another tab is still writing comes first as
// a card without a link. Storage unavailable replaces the strip and the list.
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { NativeSelect, NativeSelectOption } from "@know-meet/ui/components/native-select";
import {
  PageEyebrow,
  PageHead,
  PageHeadText,
  PageSub,
  PageTitle,
} from "@know-meet/ui/components/page-head";
import { ToggleGroup, ToggleGroupItem } from "@know-meet/ui/components/toggle-group";
import { useId } from "react";
import type { Recordings } from "../../../app/recordings/hooks";
import {
  type LibraryLayout,
  type LibrarySort,
  sortRecordings,
} from "../application/recording-format";
import { EmptyLibrary, LibrarySkeleton, ReadFailed, StorageUnavailable } from "./library-states";
import { InProgressItem, type LibraryRow, RecordingCard, RecordingRow } from "./recording-items";
import { StorageStrip } from "./storage-strip";

const SORTS: readonly { readonly value: LibrarySort; readonly label: string }[] = [
  { value: "new", label: "Newest first" },
  { value: "old", label: "Oldest first" },
  { value: "large", label: "Largest first" },
];

export interface LibraryControls {
  readonly sort: LibrarySort;
  readonly layout: LibraryLayout;
}

function Toolbar({
  controls,
  onChange,
}: {
  readonly controls: LibraryControls;
  readonly onChange: (next: LibraryControls) => void;
}) {
  const sortId = useId();
  const viewId = useId();
  return (
    <div className="mb-s4 flex flex-wrap items-end gap-x-s4 gap-y-s3 max-bp768:grid max-bp768:grid-cols-[minmax(0,1fr)]">
      <div className="grid min-w-0 gap-1.5">
        <label htmlFor={sortId} className="text-sm font-semibold">
          Sort
        </label>
        <NativeSelect
          id={sortId}
          className="w-auto max-bp768:w-full"
          value={controls.sort}
          onChange={(event) => {
            const sort = SORTS.find((option) => option.value === event.target.value);
            if (sort !== undefined) onChange({ ...controls, sort: sort.value });
          }}
        >
          {SORTS.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="grid min-w-0 gap-1.5">
        <span id={viewId} className="text-sm font-semibold">
          View
        </span>
        <ToggleGroup
          aria-labelledby={viewId}
          value={[controls.layout]}
          onValueChange={(next) => {
            const layout = next.includes("list") ? "list" : next.includes("grid") ? "grid" : null;
            if (layout !== null) onChange({ ...controls, layout });
          }}
        >
          <ToggleGroupItem value="grid">
            <KmIcon name="film" className="size-4" />
            <span>Grid</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="list">
            <KmIcon name="menu" className="size-4" />
            <span>List</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}

function Items({
  rows,
  layout,
}: {
  readonly rows: readonly LibraryRow[];
  readonly layout: LibraryLayout;
}) {
  const writing = rows.filter((row) => row.state === "recording");
  const saved = rows.filter((row) => row.state !== "recording");
  const items = [
    ...writing.map((row) => <InProgressItem key={row.id} row={row} layout={layout} />),
    ...saved.map((row) =>
      layout === "list" ? (
        <RecordingRow key={row.id} row={row} />
      ) : (
        <RecordingCard key={row.id} row={row} />
      ),
    ),
  ];
  return layout === "list" ? (
    <ul className="grid gap-s2">{items}</ul>
  ) : (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-s4">
      {items}
    </ul>
  );
}

interface LibraryViewProps {
  readonly list: Recordings;
  readonly canRecord: boolean;
  readonly controls: LibraryControls;
  readonly onControlsChange: (next: LibraryControls) => void;
}

function LibraryBody({ list, canRecord, controls, onControlsChange }: LibraryViewProps) {
  if (list.loading) return <LibrarySkeleton />;
  if (list.error !== null) return <ReadFailed onRetry={list.reload} />;
  if (list.recordings.length === 0) return <EmptyLibrary canRecord={canRecord} />;
  return (
    <>
      <Toolbar controls={controls} onChange={onControlsChange} />
      <Items rows={sortRecordings(list.recordings, controls.sort)} layout={controls.layout} />
    </>
  );
}

export function LibraryView(props: LibraryViewProps) {
  const unavailable = props.list.support === "unsupported";
  return (
    <>
      <PageHead>
        <PageHeadText>
          <PageEyebrow>On this device</PageEyebrow>
          <PageTitle>Recordings</PageTitle>
          <PageSub>
            Meetings recorded in this browser after everyone agreed. They stay on this device and
            are never uploaded.
          </PageSub>
        </PageHeadText>
      </PageHead>
      {unavailable ? (
        <StorageUnavailable />
      ) : (
        <>
          <StorageStrip />
          <section aria-labelledby="recordings-list-h">
            <h2 id="recordings-list-h" className="sr-only">
              Saved recordings
            </h2>
            <LibraryBody {...props} />
          </section>
        </>
      )}
    </>
  );
}
