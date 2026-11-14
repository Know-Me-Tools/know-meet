// TJ-ARCH-MOB-001 compliant
// The sign-in and join flows keep their own slim header (auth.html `.auth-top`,
// join.html `.j-top`), not the app bar: brand, then "Back to home" (sign-in) or
// the "No account needed" chip (join), then the theme toggle. No navigation
// (DESIGN.md "Destinations"). Below 600px the back link keeps its accessible name
// but shows only the icon; the join chip hides at 420px and below. The join flow
// also has its small footer line.
import { Badge } from "@know-meet/ui/components/badge";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";

export type FocusedFlow = "auth" | "join";

export function FocusedTopBar({ flow }: { readonly flow: FocusedFlow }) {
  return (
    <header
      className={cn(
        "mx-auto flex min-h-header-h w-full max-w-[1120px] flex-none items-center gap-s3 px-s5 py-s3",
        flow === "auth" ? "max-bp600:px-s4 max-bp600:py-s2" : "max-bp768:px-s4",
      )}
    >
      <Brand />
      <span className="flex-auto" />
      {flow === "auth" ? (
        <Link
          to="/"
          className={cn(
            "inline-flex min-h-size-target items-center gap-1.5 rounded-base px-s3 text-sm font-semibold text-muted-foreground no-underline hover:bg-card-hov hover:text-foreground",
            focusFillClass,
          )}
        >
          <KmIcon name="home" />
          <span className="max-bp600:sr-only">Back to home</span>
        </Link>
      ) : (
        <Badge variant="green" className="max-bp421:hidden">
          <KmIcon name="check" />
          No account needed
        </Badge>
      )}
      <ThemeToggle />
    </header>
  );
}

export function FocusedFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-[1120px] flex-wrap gap-x-s4 gap-y-s2 px-s5 pb-s6 text-xs text-muted-foreground max-bp768:px-s4">
      <span>Prototype — joining, dial-in and admission are simulated.</span>
    </footer>
  );
}
