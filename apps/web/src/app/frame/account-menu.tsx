// TJ-ARCH-MOB-001 compliant
// km.js `accountCluster`: signed out shows a ghost "Sign in" link; signed in an
// avatar button named "Account: <name>" with a menu (identity, Settings, Sign
// out). Flat 2.0 (D-6): the expanded state fills the avatar `selected` instead of
// the prototype's ring; the menu identity block separates by spacing, not a rule.
import { Button, buttonVariants } from "@know-meet/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@know-meet/ui/components/dropdown-menu";
import { cn } from "@know-meet/ui/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOutIcon, SettingsIcon, UserIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useAppServices } from "../app-services";

function useSessionUser() {
  const { session } = useAppServices();
  return useSyncExternalStore(session.subscribe, session.current);
}

export function AccountMenu() {
  const { session } = useAppServices();
  const user = useSessionUser();
  const navigate = useNavigate();

  if (user === null) {
    return (
      <Link
        to="/auth"
        hash="sign-in"
        data-testid="km-account-button"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "focus-visible:bg-focus! focus-visible:text-on-focus!",
        )}
      >
        <UserIcon aria-hidden="true" className="max-bp600:hidden" />
        <span>Sign in</span>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            data-testid="km-account-button"
            aria-label={`Account: ${user.name}`}
            className="group/acct rounded-round p-0 aria-expanded:bg-transparent"
          />
        }
      >
        <span
          aria-hidden="true"
          className="inline-grid size-9 place-items-center rounded-round bg-ember-soft font-display text-13 font-semibold text-ember-text transition-colors duration-(--dur-fast) group-aria-expanded/acct:bg-selected group-aria-expanded/acct:text-on-selected group-focus-visible/acct:bg-focus! group-focus-visible/acct:text-on-focus!"
        >
          {user.initials}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72">
        <div className="grid gap-0.5 px-s3 pt-s2 pb-s3">
          <strong className="font-display font-semibold [overflow-wrap:anywhere]">
            {user.name}
          </strong>
          <span className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
            {user.email}
          </span>
        </div>
        <DropdownMenuItem onClick={() => void navigate({ to: "/settings" })}>
          <SettingsIcon aria-hidden="true" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            session.signOut();
            void navigate({ to: "/" });
          }}
        >
          <LogOutIcon aria-hidden="true" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
