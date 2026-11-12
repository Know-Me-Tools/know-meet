// TJ-ARCH-MOB-001 compliant
// Pathless layouts (DESIGN.md "Destinations"): navigation appears wherever the app
// bar appears on product pages (home, dashboard, agents, recordings, settings,
// including signed-out gates); never in the meeting room, sign-in or join flows.
import { Outlet, useLocation } from "@tanstack/react-router";
import { AppBar } from "./app-bar";
import { type FocusedFlow, FocusedFooter, FocusedTopBar } from "./focused-top-bar";
import { useWidthClass } from "./use-width-class";

function Main() {
  return (
    <main id="main" tabIndex={-1} className="km-main">
      <Outlet />
    </main>
  );
}

/** App bar with the adaptive primary navigation (bar / rail / inline). */
export function FramedLayout() {
  const widthClass = useWidthClass();
  return (
    <div className="km-framed flex flex-1 flex-col" data-nav-class={widthClass}>
      <AppBar widthClass={widthClass} withNav />
      <Main />
    </div>
  );
}

/** Sign-in and join: their own slim header (no navigation), as in auth.html / join.html. */
export function FocusedLayout() {
  const flow: FocusedFlow = useLocation({ select: (location) => location.pathname }).startsWith("/join") ? "join" : "auth";
  return (
    <div className="km-framed flex flex-1 flex-col">
      <FocusedTopBar flow={flow} />
      <Main />
      {flow === "join" ? <FocusedFooter /> : null}
    </div>
  );
}

/** Meeting room: no app bar, no navigation; the room owns its chrome (c11). */
export function RoomLayout() {
  return <Main />;
}
