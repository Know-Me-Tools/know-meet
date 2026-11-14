// TJ-ARCH-MOB-001 compliant
// km.js mountAppBar `.brand`: the Gathering mark and the "Know Meet" wordmark.
// The wordmark is hidden from AT (the link is named) and visually below 381px.
import { Link } from "@tanstack/react-router";
import { KmMark } from "./km-icons";

export function Brand() {
  return (
    <Link
      to="/"
      aria-label="Know Meet home"
      className="inline-flex min-h-size-target flex-none items-center gap-2.5 rounded-base px-s1 text-foreground no-underline focus-visible:bg-focus! focus-visible:text-on-focus!"
    >
      <KmMark className="size-7 flex-none" />
      <span
        aria-hidden="true"
        className="font-display text-lg font-bold tracking-heading whitespace-nowrap max-bp768:text-base max-bp381:hidden"
      >
        Know <b className="font-bold text-ember-text in-focus-visible:text-current">Meet</b>
      </span>
    </Link>
  );
}
