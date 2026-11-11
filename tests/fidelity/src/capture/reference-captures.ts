import type { Page } from "@playwright/test";
import { settle } from "../support/capture-environment.ts";

/**
 * Reference baselines outside the route inventory that the c03 matrix must
 * also cover (plan c03): the brand guide's logo, clear-space and type rules,
 * and the live room layout. They are adjudicated by design-lead against the
 * app's rendering of the same element; they are never threshold-gated.
 */
export interface ReferenceTarget {
  readonly referenceId: string;
  /** Path below docs/design. */
  readonly page: string;
  readonly method: string;
  /** Prepares the page and returns the selector to crop to. */
  drive(page: Page): Promise<string>;
}

function brandSection(referenceId: string, sectionId: string, label: string): ReferenceTarget {
  return {
    referenceId,
    page: "brand-guide.html",
    method: `brand guide section #${sectionId} (${label}), element capture`,
    drive: async () => `section#${sectionId}`,
  };
}

export const REFERENCE_TARGETS: readonly ReferenceTarget[] = [
  brandSection("brand-guide.logo", "logo", "01 Logo"),
  brandSection("brand-guide.construction", "construction", "02 Construction"),
  brandSection("brand-guide.clear-space", "space", "03 Clear space and size"),
  brandSection("brand-guide.colour", "colour", "05 Colour"),
  brandSection("brand-guide.type", "type", "06 Typography"),
  {
    referenceId: "live-room.in-call-layout",
    page: "live/room.html",
    method:
      "live/room.html with no LiveKit connection: the in-call view (#v-room) is only shown by live-room.js after a successful connect, " +
      "so the capture un-hides #v-room and hides the other views in the DOM. Layout skeleton only (no tiles, no media); reference for meet.room",
    drive: async (page: Page) => {
      await page.evaluate(() => {
        for (const view of Array.from(document.querySelectorAll<HTMLElement>(".view"))) {
          view.hidden = view.id !== "v-room";
        }
      });
      await settle(page);
      return "#v-room";
    },
  },
];
