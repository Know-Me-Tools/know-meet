/**
 * WC-13 room geometry: what a person can actually see in the room, measured against
 * the viewport. Added after the 2026-11-20 closing review found the room shell not
 * pinned to the viewport (the control bar floated, the side sheet was only as tall as
 * the tiles, chat bubbles collapsed) while every presence check passed. The prototype
 * (docs/design/live/assets/room.css) pins the room to 100dvh with the bar as the last
 * row and the sheet the full height of the room body.
 * - The bar's bottom edge is the viewport's bottom edge (within 2 px).
 * - An open sheet reaches down to the bar (gap at most 32 px: the docked sheet keeps
 *   s4 above the body's bottom; the bottom sheet below 768 sits on it).
 * - In an open chat sheet, the newest message text and the composer input lie inside
 *   the sheet with a real size.
 * Outside the room (no bar) nothing is checked. Runs in the page; self-contained.
 */
import type { Page } from "@playwright/test";

interface LayoutIds {
  readonly leave: string;
  readonly sheet: string;
  readonly messageText: string;
  readonly chatInput: string;
}

const IDS: LayoutIds = {
  leave: "km-room-leave",
  sheet: "km-room-sheet",
  messageText: "km-chat-message-text",
  chatInput: "km-chat-input",
};

/** Largest gap allowed between an open sheet's bottom edge and the bar's top edge, px. */
const SHEET_GAP_MAX_PX = 32;
/** Rounding tolerance for edge comparisons, px. */
const EDGE_PX = 2;

function roomLayoutInPage(args: { ids: LayoutIds; sheetGapMax: number; edge: number }): string[] {
  const { ids, sheetGapMax, edge } = args;
  const problems: string[] = [];
  const leave = document.querySelector(`[data-testid="${ids.leave}"]`);
  const bar = leave?.closest("nav") ?? null;
  if (bar === null) return problems;
  const barBox = bar.getBoundingClientRect();
  const vh = window.innerHeight;
  if (barBox.bottom > vh + edge || barBox.bottom < vh - edge) {
    problems.push(
      `room bar not pinned to the bottom: bottom ${Math.round(barBox.bottom)}px in a ${vh}px viewport`,
    );
  }
  const sheet = document.getElementById(ids.sheet);
  if (sheet === null || sheet.inert || getComputedStyle(sheet).visibility === "hidden") {
    return problems;
  }
  const sheetBox = sheet.getBoundingClientRect();
  const gap = barBox.top - sheetBox.bottom;
  if (gap < -edge || gap > sheetGapMax) {
    problems.push(`room sheet bottom is ${Math.round(gap)}px above the bar (max ${sheetGapMax}px)`);
  }
  const inside = (el: Element): boolean => {
    const box = el.getBoundingClientRect();
    return (
      box.width > edge &&
      box.height > edge &&
      box.top >= sheetBox.top - edge &&
      box.bottom <= sheetBox.bottom + edge
    );
  };
  // A pane that is not shown (display: none) has no client rects and is skipped; a
  // shown element squeezed to nothing still has rects and fails `inside`.
  const rendered = (el: Element | null | undefined): el is Element =>
    el !== null && el !== undefined && el.getClientRects().length > 0;
  const messages = Array.from(sheet.querySelectorAll(`[data-testid="${ids.messageText}"]`));
  const newest = messages.at(-1);
  if (rendered(newest) && !inside(newest)) {
    problems.push("newest chat message is not visible inside the sheet");
  }
  const input = sheet.querySelector(`[data-testid="${ids.chatInput}"]`);
  if (rendered(input) && !inside(input)) {
    problems.push("chat input is not inside the sheet");
  }
  return problems;
}

export async function roomLayoutProblems(page: Page): Promise<string[]> {
  return page.evaluate(roomLayoutInPage, {
    ids: IDS,
    sheetGapMax: SHEET_GAP_MAX_PX,
    edge: EDGE_PX,
  });
}
