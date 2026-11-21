// TJ-ARCH-MOB-001 compliant
// /recordings in the hosted build (wc10 task 10.5, shape
// docs/design/shapes/web-conferencing/recordings-library.md; WC-8, WC-10, WC-13):
// recordings made in this browser after everyone agreed, kept only on this device
// (D1; nothing is uploaded). The library is the route itself; one recording opens at
// `/recordings#recording:<id>` through client navigation only, so the id never reaches
// a request (RL-12). The list is read again whenever the screen opens, so a recording
// whose tab died shows as incomplete. The root carries the scenario contract id
// `km-recordings-library` once the first read has finished, so whoever sees it sees
// the real list, never the loading shell. The default build's /recordings stays the
// prototype RecordingsScreen.
//
// Focus on a hash change: into the detail, its `h1`; back to the library (back link or
// browser Back), the card that was opened; after a delete, the card that followed it,
// or the `h1` when none did (shape §6).
import type { RecordingRequestId } from "@know-meet/domain";
import { Toaster, toast } from "@know-meet/ui/components/toast";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useRecordings, useRoomRecording } from "../../../app/recordings/hooks";
import { ScreenPage } from "../../shared/screen-page";
import { useDocumentTitle } from "../../shared/use-document-title";
import { type LibraryLayout, sortRecordings } from "../application/recording-format";
import { resolveRecordingsView } from "../application/recordings-route";
import { type LibraryControls, LibraryView } from "./library-view";
import { NotFoundView, OpeningView } from "./recording-detail-states";
import { RecordingDetailView } from "./recording-detail-view";
import type { LibraryRow } from "./recording-items";

const LAYOUT_KEY = "km-recordings-layout";

/** Grid/List is kept for the browser session only (shape §8); storage may be blocked. */
function readLayout(): LibraryLayout {
  try {
    return window.sessionStorage.getItem(LAYOUT_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

function writeLayout(layout: LibraryLayout): void {
  try {
    window.sessionStorage.setItem(LAYOUT_KEY, layout);
  } catch {
    // Session storage blocked (some private windows): the choice lasts until reload.
  }
}

function focusPageHeading(): void {
  const heading = document.querySelector<HTMLElement>("main h1");
  if (heading === null) return;
  if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
  heading.focus({ preventScroll: true });
}

/** Focuses the link of a recording in the library; false when it is not shown. */
function focusItem(id: RecordingRequestId): boolean {
  const link = document.querySelector<HTMLElement>(
    `[data-testid="km-recording-item"][data-recording-id="${CSS.escape(id)}"]`,
  );
  if (link === null) return false;
  link.focus();
  return true;
}

/** Reads the list once when the screen opens (the hook's `reload` may change identity). */
function useReloadOnOpen(reload: () => void): void {
  const latest = useRef(reload);
  latest.current = reload;
  useEffect(() => {
    latest.current();
  }, []);
}

export function LocalRecordingsScreen() {
  useDocumentTitle("Recordings — Know Meet");
  const hash = useLocation({ select: (location) => location.hash });
  const navigate = useNavigate();
  const view = resolveRecordingsView(hash);
  const list = useRecordings();
  const { support: recorderSupport } = useRoomRecording();
  const [controls, setControls] = useState<LibraryControls>(() => ({
    sort: "new",
    layout: readLayout(),
  }));
  /** The card to focus when the library shows again: the one opened, or the one after a deleted one. */
  const returnItem = useRef<RecordingRequestId | null>(null);
  const previousHash = useRef(hash);
  useReloadOnOpen(list.reload);

  useEffect(() => {
    if (previousHash.current === hash) return; // first render, or no change
    previousHash.current = hash;
    const current = resolveRecordingsView(hash);
    if (current.kind === "detail") returnItem.current = current.id;
    if (current.kind !== "list") {
      window.scrollTo(0, 0);
      focusPageHeading();
      return;
    }
    const item = returnItem.current;
    returnItem.current = null;
    if (item === null || !focusItem(item)) {
      window.scrollTo(0, 0);
      focusPageHeading();
    }
  }, [hash]);

  const onControlsChange = (next: LibraryControls) => {
    if (next.layout !== controls.layout) writeLayout(next.layout);
    setControls(next);
  };

  const onDeleted = (row: LibraryRow) => {
    const saved = sortRecordings(
      list.recordings.filter((entry) => entry.state !== "recording"),
      controls.sort,
    );
    const index = saved.findIndex((entry) => entry.id === row.id);
    returnItem.current = index === -1 ? null : (saved[index + 1]?.id ?? null);
    toast.add({ title: "Recording deleted from this browser." });
    void navigate({ to: "/recordings", replace: true });
  };

  const detailRow =
    view.kind === "detail" ? (list.recordings.find((row) => row.id === view.id) ?? null) : null;

  return (
    <Toaster>
      <ScreenPage data-testid={list.loading ? undefined : "km-recordings-library"}>
        {view.kind === "list" ? (
          <LibraryView
            list={list}
            canRecord={recorderSupport !== "unsupported"}
            controls={controls}
            onControlsChange={onControlsChange}
          />
        ) : detailRow !== null ? (
          <RecordingDetailView key={detailRow.id} row={detailRow} onDeleted={onDeleted} />
        ) : view.kind === "detail" && list.loading ? (
          <OpeningView />
        ) : (
          <NotFoundView />
        )}
      </ScreenPage>
    </Toaster>
  );
}
