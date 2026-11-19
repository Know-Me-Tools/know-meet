// TJ-ARCH-MOB-001 compliant
// DESIGN.md "Destinations": five, in this order, same icons and labels on every
// surface (Flutter mirrors this list in c12). The hosted build has its own list of
// three (DESIGN.md "Hosted build navigation (operator 2026-11-18)").
import type { KmIconName } from "./km-icons";

export interface Destination {
  readonly to: "/" | "/dashboard" | "/history" | "/recordings" | "/agents" | "/settings";
  readonly label: string;
  readonly icon: KmIconName;
  /**
   * The link's test id. The default build keeps the fidelity oracle's `km-nav-item`;
   * the hosted build uses the scenario contract ids (tests/release/src/wc-test-ids.ts
   * NAV, HISTORY.nav, RECORDING.nav), since one element carries one data-testid.
   */
  readonly testId: string;
}

export const DESTINATIONS: readonly Destination[] = [
  { to: "/", label: "Home", icon: "home", testId: "km-nav-item" },
  { to: "/dashboard", label: "Meetings", icon: "calendar", testId: "km-nav-item" },
  { to: "/recordings", label: "Recordings", icon: "film", testId: "km-nav-item" },
  { to: "/agents", label: "Agents", icon: "agent-add", testId: "km-nav-item" },
  { to: "/settings", label: "Settings", icon: "settings", testId: "km-nav-item" },
];

export const HOSTED_DESTINATIONS: readonly Destination[] = [
  { to: "/", label: "Home", icon: "home", testId: "km-nav-home" },
  { to: "/history", label: "History", icon: "clock", testId: "km-nav-history" },
  { to: "/recordings", label: "Recordings", icon: "film", testId: "km-nav-recordings" },
];
