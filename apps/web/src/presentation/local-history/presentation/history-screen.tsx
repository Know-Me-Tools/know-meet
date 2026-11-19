// TJ-ARCH-MOB-001 compliant
// /history (wc09 task 9.4, shape docs/design/shapes/web-conferencing/local-history.md):
// meetings and the chat this browser received, kept only on this device (D5, no
// backfill D3). The list is the route itself; one meeting opens at
// `/history#meeting:<id>` through client navigation only, so the local id never
// reaches a request (WC-7, LH-12). The root keeps the scenario contract id
// `km-screen-history` (tests/release/src/wc-test-ids.ts).
//
// Focus on a hash change: into the detail, the `h1`; back to the list (back link or
// browser Back), the row that was opened; after deleting a meeting, the row that
// followed it, or the `h1` when none did (shape §6, §8).
import type { MeetingHistoryId } from "@know-meet/domain";
import { Toaster, toast } from "@know-meet/ui/components/toast";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useHistoryStorage, useMeetingHistoryList } from "../../../app/history/hooks";
import { ScreenPage } from "../../shared/screen-page";
import { resolveHistoryView } from "../application/history-route";
import { HistoryDetailView, NotFoundDetailView } from "./history-detail-view";
import { HistoryListView } from "./history-list-view";

function focusPageHeading(): void {
  const heading = document.querySelector<HTMLElement>("main h1");
  if (heading === null) return;
  if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
  heading.focus({ preventScroll: true });
}

/** Focuses the row link of a meeting in the list; false when that row is not shown. */
function focusRow(id: MeetingHistoryId): boolean {
  const link = document.querySelector<HTMLElement>(
    `[data-history-id="${CSS.escape(id)}"] [data-testid="km-history-entry-open"]`,
  );
  if (link === null) return false;
  link.focus();
  return true;
}

export function HistoryScreen() {
  const hash = useLocation({ select: (location) => location.hash });
  const navigate = useNavigate();
  const view = resolveHistoryView(hash);
  const list = useMeetingHistoryList();
  const storage = useHistoryStorage();
  /** The row to focus when the list shows again: the one opened, or the one after a deleted one. */
  const returnRow = useRef<MeetingHistoryId | null>(null);
  const previousHash = useRef(hash);

  useEffect(() => {
    if (previousHash.current === hash) return; // first render, or no change
    previousHash.current = hash;
    const current = resolveHistoryView(hash);
    if (current.kind === "detail") returnRow.current = current.id;
    if (current.kind !== "list") {
      window.scrollTo(0, 0);
      focusPageHeading();
      return;
    }
    const row = returnRow.current;
    returnRow.current = null;
    if (row === null || !focusRow(row)) {
      window.scrollTo(0, 0);
      focusPageHeading();
    }
  }, [hash]);

  const onDeleted = (id: MeetingHistoryId) => {
    const index = list.meetings.findIndex((meeting) => meeting.id === id);
    returnRow.current = index === -1 ? null : (list.meetings[index + 1]?.id ?? null);
    toast.add({ title: "Meeting deleted from this browser." });
    void navigate({ to: "/history", replace: true });
  };

  return (
    <Toaster>
      <ScreenPage data-testid="km-screen-history">
        {view.kind === "list" ? (
          <HistoryListView list={list} storage={storage.status} />
        ) : view.kind === "detail" ? (
          <HistoryDetailView
            key={view.id}
            id={view.id}
            storageBlocked={storage.status === "blocked"}
            onDeleted={onDeleted}
          />
        ) : (
          <NotFoundDetailView />
        )}
      </ScreenPage>
    </Toaster>
  );
}
