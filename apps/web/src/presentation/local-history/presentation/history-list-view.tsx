// TJ-ARCH-MOB-001 compliant
// /history list (shape local-history.md §2, §4, §6, LH-4): page head ("On this
// device" / "History"), the D5 notice with "Delete all history" (one row from the
// expanded width), then the list area by state: storage blocked, loading, read
// error, empty, or day groups with "Show 50 more". Delete all confirms first; on
// success the empty state takes focus and a toast confirms.
import type { HistoryStorageStatus } from "@know-meet/domain";
import { Button } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { PageEyebrow, PageHead, PageHeadText, PageTitle } from "@know-meet/ui/components/page-head";
import { Spinner } from "@know-meet/ui/components/spinner";
import { toast } from "@know-meet/ui/components/toast";
import { useState } from "react";
import { type MeetingHistoryList, useDeleteAllMeetingHistory } from "../../../app/history/hooks";
import { useDocumentTitle } from "../../shared/use-document-title";
import { groupByDay } from "../application/history-format";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";
import { DeviceOnlyNotice } from "./device-only-notice";
import { HistoryDayGroups } from "./history-day-groups";
import {
  EmptyHistory,
  HistoryReadError,
  HistorySkeleton,
  StorageBlockedNote,
} from "./history-list-states";
import { useDelayedFlag } from "./use-delayed-flag";

function DeleteAllControl({ onCleared }: { readonly onCleared: () => void }) {
  const { deleteAll, pending } = useDeleteAllMeetingHistory();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [cleared, setCleared] = useState(false);

  const confirm = async () => {
    setFailed(false);
    const ok = await deleteAll();
    if (!ok) {
      setFailed(true);
      return;
    }
    setCleared(true);
    setOpen(false);
    onCleared();
    toast.add({ title: "History deleted from this browser." });
  };

  return (
    <>
      <Button
        variant="ghost"
        className="justify-self-start expanded:justify-self-end"
        onClick={() => {
          setFailed(false);
          setCleared(false);
          setOpen(true);
        }}
      >
        <KmIcon name="trash" />
        <span>Delete all history</span>
      </Button>
      <ConfirmDeleteDialog
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next);
        }}
        title="Delete all history?"
        confirmLabel="Delete all history"
        pending={pending}
        failed={failed}
        returnFocus={!cleared}
        onConfirm={() => void confirm()}
      >
        Every meeting and chat message saved in this browser is removed. Recordings are kept in
        Recordings. This can't be undone.
      </ConfirmDeleteDialog>
    </>
  );
}

function ListArea({
  list,
  storage,
  focusEmpty,
}: {
  readonly list: MeetingHistoryList;
  readonly storage: HistoryStorageStatus | null;
  readonly focusEmpty: boolean;
}) {
  const waiting = storage === null || list.loading;
  const showSkeleton = useDelayedFlag(waiting);
  if (storage === "blocked") return <StorageBlockedNote />;
  if (waiting) return <HistorySkeleton visible={showSkeleton} />;
  if (list.error !== null) {
    return <HistoryReadError title="History couldn't be read" onRetry={list.reload} />;
  }
  if (list.meetings.length === 0) return <EmptyHistory focusHeading={focusEmpty} />;
  const now = new Date();
  return (
    <div className="grid min-w-0 gap-s5">
      <HistoryDayGroups groups={groupByDay(list.meetings, now)} now={now} />
      {list.hasMore ? (
        <div>
          <Button
            variant="secondary"
            disabled={list.loadingMore}
            focusableWhenDisabled
            onClick={list.loadMore}
          >
            {list.loadingMore ? (
              <>
                <Spinner
                  aria-hidden="true"
                  role="presentation"
                  className="motion-reduce:animate-none"
                />
                <span>Loading...</span>
              </>
            ) : (
              "Show 50 more"
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function HistoryListView({
  list,
  storage,
}: {
  readonly list: MeetingHistoryList;
  readonly storage: HistoryStorageStatus | null;
}) {
  const [focusEmpty, setFocusEmpty] = useState(false);
  useDocumentTitle("History — Know Meet");
  const canDeleteAll =
    storage !== null && storage !== "blocked" && !list.loading && list.meetings.length > 0;
  return (
    <>
      <PageHead>
        <PageHeadText>
          <PageEyebrow>On this device</PageEyebrow>
          <PageTitle>History</PageTitle>
        </PageHeadText>
      </PageHead>
      <div className="grid min-w-0 gap-s5">
        <div className="grid min-w-0 gap-s3 expanded:grid-cols-[minmax(0,1fr)_auto] expanded:items-start expanded:gap-s4">
          <DeviceOnlyNotice nonPersistent={storage === "non-persistent"} />
          {canDeleteAll ? <DeleteAllControl onCleared={() => setFocusEmpty(true)} /> : null}
        </div>
        <ListArea list={list} storage={storage} focusEmpty={focusEmpty} />
      </div>
    </>
  );
}
