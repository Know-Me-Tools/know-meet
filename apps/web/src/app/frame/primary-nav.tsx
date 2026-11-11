// TJ-ARCH-MOB-001 compliant
// DESIGN.md "Adaptive layout": ONE <nav aria-label="Primary"> in every width
// class; the class (data-nav-class = bar | rail | inline) changes layout only,
// never the DOM, so a focused destination keeps focus through the morph.
// Layout and states live in styles/frame.css; test hooks follow
// tests/fidelity/oracle/app-state-map.json (km-appnav, km-nav-item, km-nav-indicator).
import { Link } from "@tanstack/react-router";
import { DESTINATIONS } from "./destinations";
import { KmIcon } from "./km-icons";
import type { WidthClass } from "./width-class";

export function PrimaryNav({ widthClass }: { readonly widthClass: WidthClass }) {
  return (
    <nav aria-label="Primary" data-testid="km-appnav" data-nav-class={widthClass} className="km-nav">
      <ul className="km-nav-list">
        {DESTINATIONS.map((destination) => (
          <li key={destination.to}>
            <Link
              to={destination.to}
              data-testid="km-nav-item"
              className="km-nav-item"
              activeOptions={{ exact: destination.to === "/", includeHash: false }}
              activeProps={{ "aria-current": "page" }}
            >
              <span data-testid="km-nav-indicator" className="km-nav-indicator">
                <KmIcon name={destination.icon} className="km-nav-icon" />
              </span>
              <span className="km-nav-label">{destination.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
