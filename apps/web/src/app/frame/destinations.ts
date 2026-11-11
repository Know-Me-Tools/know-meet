// TJ-ARCH-MOB-001 compliant
// DESIGN.md "Destinations": five, in this order, same icons and labels on every
// surface (Flutter mirrors this list in c12).
import type { KmIconName } from "./km-icons";

export interface Destination {
  readonly to: "/" | "/dashboard" | "/recordings" | "/agents" | "/settings";
  readonly label: string;
  readonly icon: KmIconName;
}

export const DESTINATIONS: readonly Destination[] = [
  { to: "/", label: "Home", icon: "home" },
  { to: "/dashboard", label: "Meetings", icon: "calendar" },
  { to: "/recordings", label: "Recordings", icon: "film" },
  { to: "/agents", label: "Agents", icon: "agent-add" },
  { to: "/settings", label: "Settings", icon: "settings" },
];
