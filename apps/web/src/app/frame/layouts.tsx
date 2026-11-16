// TJ-ARCH-MOB-001 compliant
// Pathless layouts (DESIGN.md "Destinations"): navigation appears wherever the app
// bar appears on product pages (home, dashboard, agents, recordings, settings,
// including signed-out gates); never in the meeting room, sign-in or join flows.
import { Outlet, useLocation } from "@tanstack/react-router";
import { HOSTED_BUILD } from "../build-mode";
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

/**
 * App bar with the adaptive primary navigation (bar / rail / inline). The hosted
 * build has one product page, so its bar is the brand and the theme toggle only,
 * and no navigation class is set (the layout reserves no room for a nav).
 */
export function FramedLayout() {
  const widthClass = useWidthClass();
  return (
    <div
      className="km-framed flex flex-1 flex-col"
      data-nav-class={HOSTED_BUILD ? undefined : widthClass}
    >
      <AppBar widthClass={widthClass} withNav={!HOSTED_BUILD} minimal={HOSTED_BUILD} />
      <Main />
    </div>
  );
}

/**
 * Sign-in and join: their own slim header (no navigation), as in auth.html / join.html.
 * The footer line says joining is simulated, which the hosted build's real meetings
 * are not, so the hosted join page has no such footer.
 */
export function FocusedLayout() {
  const flow: FocusedFlow = useLocation({ select: (location) => location.pathname }).startsWith(
    "/join",
  )
    ? "join"
    : "auth";
  return (
    <div className="km-framed flex flex-1 flex-col">
      <FocusedTopBar flow={flow} />
      <Main />
      {flow === "join" && !HOSTED_BUILD ? <FocusedFooter /> : null}
    </div>
  );
}

/** Meeting room: no app bar, no navigation; the room owns its chrome (c11). */
export function RoomLayout() {
  return <Main />;
}
