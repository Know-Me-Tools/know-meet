// TJ-ARCH-MOB-001 compliant
// km.css `.skip-link`: the first focusable element; hidden above the viewport
// until focused. Focus is the `focus` fill (D-6), not the prototype's ember button.
// Activating it moves focus to main#main (tabIndex -1), so it works in every router state.
import type * as React from "react";

export function SkipLink() {
  const onClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const main = event.currentTarget.ownerDocument.getElementById("main");
    if (main === null) return;
    event.preventDefault();
    main.focus();
    main.scrollIntoView({ block: "start" });
  };
  return (
    // biome-ignore lint/a11y/useValidAnchor: a skip link is in-page navigation, so it stays an anchor with a real #main href; onClick only stops the hash router from treating the fragment as a route.
    <a
      href="#main"
      onClick={onClick}
      className="absolute top-[-100px] left-s4 z-(--z-skip-link) rounded-base bg-primary px-s4 py-s2 font-semibold text-primary-foreground no-underline outline-none focus-visible:top-s2 focus-visible:bg-focus! focus-visible:text-on-focus! focus:top-s2"
    >
      Skip to content
    </a>
  );
}
