// TJ-ARCH-MOB-001 compliant
// DESIGN.md "App bar (all classes)": `header-h` plus the top safe area, fill `bg`,
// no bottom rule. Brand, then (inline class only, by CSS) the primary links, then
// Start meeting, theme toggle and account. At the bar class Start meeting is
// icon-only (44px). The nav element is always rendered here when `withNav`, so
// its DOM position never changes; bar and rail classes position it fixed.
import { buttonVariants } from "@know-meet/ui/components/button";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { AccountMenu } from "./account-menu";
import { Brand } from "./brand";
import { KmIcon } from "./km-icons";
import { PrimaryNav } from "./primary-nav";
import { ThemeToggle } from "./theme-toggle";
import type { WidthClass } from "./width-class";

interface AppBarProps {
  readonly widthClass: WidthClass;
  readonly withNav: boolean;
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

export function AppBar({ widthClass, withNav }: AppBarProps) {
  return (
    <header data-testid="km-appbar" className="km-appbar">
      <div className="km-appbar-inner">
        <Brand />
        {withNav ? <PrimaryNav widthClass={widthClass} /> : null}
        <div className="ml-auto flex flex-none items-center gap-s2">
          <StartMeeting iconOnly={widthClass === "bar"} />
          <ThemeToggle />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
