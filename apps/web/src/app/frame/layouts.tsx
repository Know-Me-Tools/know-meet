// TJ-ARCH-MOB-001 compliant
// Pathless layouts (DESIGN.md "Destinations"): navigation appears wherever the app
// bar appears on product pages (home, dashboard, agents, recordings, settings,
// including signed-out gates); never in the meeting room, sign-in or join flows.
import { Outlet } from "@tanstack/react-router";
import { AppBar } from "./app-bar";
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

/** Sign-in and join: the app bar without navigation. */
export function FocusedLayout() {
  const widthClass = useWidthClass();
  return (
    <div className="km-framed flex flex-1 flex-col">
      <AppBar widthClass={widthClass} withNav={false} />
      <Main />
    </div>
  );
}

/** Meeting room: no app bar, no navigation; the room owns its chrome (c11). */
export function RoomLayout() {
  return <Main />;
}
