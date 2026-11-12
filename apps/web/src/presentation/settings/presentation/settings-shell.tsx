// TJ-ARCH-MOB-001 compliant
// settings.html `shell()` and `head()`: km.css `.layout-side` (240px side nav +
// content, one column under 900px) and the `.sidenav` link list. Under 900px the
// group labels hide and each group's links scroll sideways (km.css bp-899). The
// current section is `aria-current="page"` with the `selected` fill (DESIGN.md
// nav item); focus is the `focus` fill. Every page head carries a breadcrumb.
import { KmIcon, type KmIconName } from "@know-meet/ui/components/km-icon";
import {
  PageActions,
  PageEyebrow,
  PageHead,
  PageHeadText,
  PageSub,
  PageTitle,
} from "@know-meet/ui/components/page-head";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import type * as React from "react";
import { useDocumentTitle } from "../../shared/use-document-title";
import { activeNavKey, groupLabelOf, SETTINGS_NAV } from "../application/settings-nav";
import type { SettingsNavKey, SettingsSection } from "../domain/settings";
import { SettingsLink } from "./settings-link";

const NAV_ICONS: Readonly<Record<SettingsNavKey, KmIconName>> = {
  account: "user",
  notifications: "mail",
  livekit: "server",
  "telnyx-sms": "sms",
  "telnyx-voice": "phone-in",
  calendars: "calendar",
  storage: "database",
  recording: "record",
  delivery: "send",
  templates: "edit",
};

const navLinkClass = cn(
  "flex min-h-size-target w-full items-center gap-s3 rounded-base px-s3 text-left text-sm font-semibold text-muted-foreground no-underline transition-colors duration-(--dur-fast) ease-standard",
  "[@media(hover:hover)]:[&:not([aria-current])]:hover:bg-card-hov [@media(hover:hover)]:[&:not([aria-current])]:hover:text-foreground",
  "aria-[current=page]:bg-selected aria-[current=page]:text-on-selected",
  "max-bp900:w-auto max-bp900:flex-none max-bp900:whitespace-nowrap",
  focusFillClass,
);

function SettingsNav({ section }: { readonly section: SettingsSection }) {
  const active = activeNavKey(section);
  return (
    <nav
      aria-label="Settings sections"
      className="sticky top-[calc(var(--spacing-header-h)+var(--spacing-s5))] grid min-w-0 gap-0.5 max-bp900:static"
    >
      <PageEyebrow className="px-s3 pb-s2">Settings</PageEyebrow>
      {SETTINGS_NAV.map((group) => (
        <div key={group.label} className="grid min-w-0 gap-0.5">
          <span className="block px-s3 pt-s4 pb-s1 font-mono text-11 font-semibold tracking-eyebrow text-muted-foreground uppercase max-bp900:hidden">
            {group.label}
          </span>
          <ul className="m-0 grid list-none gap-0.5 p-0 max-bp900:flex max-bp900:gap-s1 max-bp900:overflow-x-auto max-bp900:[scrollbar-width:none] max-bp900:[&::-webkit-scrollbar]:hidden">
            {group.items.map((item) => (
              <li key={item.key} className="max-bp900:flex-none">
                <SettingsLink
                  hash={item.key}
                  aria-current={item.key === active ? "page" : undefined}
                  className={navLinkClass}
                >
                  <KmIcon name={NAV_ICONS[item.key]} />
                  <span>{item.label}</span>
                </SettingsLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** km.css `.layout-side` with the settings nav and the `.content` column. */
export function SettingsLayout({
  section,
  children,
}: {
  readonly section: SettingsSection;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[240px_minmax(0,1fr)] items-start gap-s6 max-bp900:grid-cols-[minmax(0,1fr)] max-bp900:gap-s5">
      <SettingsNav section={section} />
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-s5">{children}</div>
    </div>
  );
}

const crumbLinkClass = cn(
  "text-muted-foreground no-underline hover:text-foreground hover:underline",
  focusFillClass,
);

interface SettingsHeadProps {
  readonly section: SettingsSection;
  readonly title: string;
  readonly description?: string;
  readonly actions?: React.ReactNode;
  /** A third crumb back to the parent page, e.g. ["Calendars", "calendars"]. */
  readonly parent?: readonly [label: string, hash: SettingsNavKey | "storage-s3"];
}

/** settings.html `head(c, key, title, desc, actions, extraCrumb)`. */
export function SettingsHead({ section, title, description, actions, parent }: SettingsHeadProps) {
  useDocumentTitle(`${title} · Settings · Know Meet`);
  return (
    <PageHead className="mb-0 max-bp768:mb-0 max-bp768:items-start">
      <PageHeadText>
        <nav
          aria-label="Breadcrumb"
          className="mb-s2 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
        >
          <SettingsLink hash="account" className={crumbLinkClass}>
            Settings
          </SettingsLink>
          <KmIcon name="chevron-right" className="size-3.5" />
          <span>{groupLabelOf(section)}</span>
          {parent === undefined ? null : (
            <>
              <KmIcon name="chevron-right" className="size-3.5" />
              <SettingsLink hash={parent[1]} className={crumbLinkClass}>
                {parent[0]}
              </SettingsLink>
            </>
          )}
        </nav>
        <PageTitle>{title}</PageTitle>
        {description === undefined ? null : <PageSub>{description}</PageSub>}
      </PageHeadText>
      {actions === undefined ? null : <PageActions>{actions}</PageActions>}
    </PageHead>
  );
}
