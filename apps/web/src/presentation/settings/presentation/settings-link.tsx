// TJ-ARCH-MOB-001 compliant
// A link to a settings sub-state (`/settings#<hash>`). TanStack Router marks any
// link to the current path active and forces `aria-current="page"` on it; every
// settings link shares the path, so activity must include the hash or every
// link (crumbs, buttons, the whole side nav) would announce as the current page.
import { Link } from "@tanstack/react-router";
import type * as React from "react";

const ACTIVE_OPTIONS = { exact: true, includeHash: true } as const;

export function SettingsLink({ hash, ...props }: Omit<React.ComponentProps<"a">, "href"> & { readonly hash: string }) {
  return <Link to="/settings" hash={hash} activeOptions={ACTIVE_OPTIONS} activeProps={{}} {...props} />;
}
