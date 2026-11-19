// TJ-ARCH-MOB-001 compliant
// meet.html `.pane` inside `.rsheet`: the head (h2, a one-line lede, the close button),
// a scrolling body (`.rsheet-scroll`, contained overscroll) and an optional foot
// (`.rsheet-foot`, the composer). Inactive panes stay mounted but `hidden`, so their
// state survives switching panes. No eyebrow above the title (the heading carries it).
// The title takes programmatic focus (tabindex -1) for panes that move focus to it on open
// (Settings, device-settings shape section 8); it is never a tab stop.
import { Button } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import type * as React from "react";
import { paneTitleId, type RoomPaneId } from "./room-sheet";

interface RoomSheetPaneProps {
  readonly pane: RoomPaneId;
  /** True when this is the sheet's current pane (open or closing). */
  readonly shown: boolean;
  readonly title: string;
  readonly lede: React.ReactNode;
  readonly closeLabel: string;
  readonly onClose: () => void;
  readonly bodyRef?: React.Ref<HTMLElement>;
  /** Accessible name of the scrolling body region. */
  readonly bodyLabel: string;
  readonly foot?: React.ReactNode;
  readonly children: React.ReactNode;
  /** Scenario contract id of the pane (km-chat-panel). */
  readonly testId?: string;
}

export function RoomSheetPane({
  pane,
  shown,
  title,
  lede,
  closeLabel,
  onClose,
  bodyRef,
  bodyLabel,
  foot,
  children,
  testId,
}: RoomSheetPaneProps) {
  return (
    <div
      data-testid={testId}
      hidden={!shown}
      className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-s2 pt-s4 pr-s3 pb-s3 pl-s5">
        <div className="grid min-w-0 gap-1">
          <h2 id={paneTitleId(pane)} tabIndex={-1} className="text-xl outline-none">
            {title}
          </h2>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">{lede}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label={closeLabel} onClick={onClose}>
          <KmIcon name="x" />
        </Button>
      </div>
      <section
        ref={bodyRef}
        aria-label={bodyLabel}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a named scroll region whose content may hold no control of its own (a chat log) must be keyboard-reachable to scroll (RV-23, WCAG 2.1.1).
        tabIndex={0}
        className={cn(
          "min-h-0 overflow-y-auto overscroll-contain rounded-base px-s5 pb-s4",
          focusFillClass,
          "focus-visible:**:bg-transparent! focus-visible:**:text-inherit!",
        )}
      >
        {children}
      </section>
      {foot === undefined ? <div /> : <div className="grid gap-s2 px-s4 pt-s3 pb-s4">{foot}</div>}
    </div>
  );
}
