// TJ-ARCH-MOB-001 compliant
// DESIGN.md "App bar (all classes)": `header-h` plus the top safe area, fill `bg`,
// no bottom rule. Brand, then (inline class only, by CSS) the primary links, then
// Start meeting, theme toggle and account. At the bar class Start meeting is
// icon-only (44px). The nav element is always rendered here, so its DOM position
// never changes; bar and rail classes position it fixed.
import { buttonVariants } from "@know-meet/ui/components/button";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { AccountMenu } from "./account-menu";
import { Brand } from "./brand";
import type { Destination } from "./destinations";
import { KmIcon } from "./km-icons";
import { PrimaryNav } from "./primary-nav";
import { ThemeToggle } from "./theme-toggle";
import type { WidthClass } from "./width-class";

interface AppBarProps {
  readonly widthClass: WidthClass;
  /** The primary navigation's destinations: five (default build) or three (hosted build). */
  readonly destinations: readonly Destination[];
  /**
   * Brand, navigation and theme toggle only: no Start meeting link, no sign-in or
   * account (hosted build, DESIGN.md "Hosted build navigation").
   */
  readonly minimal: boolean;
}

function StartMeeting({ iconOnly }: { readonly iconOnly: boolean }) {
  return (
    <Link
      to="/meet"
      hash="start"
      aria-label={iconOnly ? "Start meeting" : undefined}
      className={cn(
        buttonVariants({ variant: "default", size: iconOnly ? "icon" : "sm" }),
        "focus-visible:bg-focus! focus-visible:text-on-focus!",
      )}
    >
      <KmIcon name="cam" className="size-5" />
      {iconOnly ? null : <span>Start meeting</span>}
    </Link>
  );
}

export function AppBar({ widthClass, destinations, minimal }: AppBarProps) {
  return (
    <header data-testid="km-appbar" className="km-appbar">
      <div className="km-appbar-inner">
        <Brand />
        <PrimaryNav widthClass={widthClass} destinations={destinations} />
        <div className="ml-auto flex flex-none items-center gap-s2">
          {minimal ? null : <StartMeeting iconOnly={widthClass === "bar"} />}
          <ThemeToggle />
          {minimal ? null : <AccountMenu />}
        </div>
      </div>
    </header>
  );
}
