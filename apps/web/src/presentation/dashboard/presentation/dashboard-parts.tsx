// TJ-ARCH-MOB-001 compliant
// Shared dashboard pieces (dashboard.html UI helpers): section tabs, breadcrumbs,
// source / channel / delivery-status chips (icon + text, never colour alone),
// meta items, the invitee avatar stack, agent chips, copy-link buttons, switch
// rows and agent state lines.
import { Avatar, AvatarFallback } from "@know-meet/ui/components/avatar";
import { Badge, BadgePip } from "@know-meet/ui/components/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@know-meet/ui/components/breadcrumb";
import { Button } from "@know-meet/ui/components/button";
import { KmIcon, type KmIconName } from "@know-meet/ui/components/km-icon";
import { Label } from "@know-meet/ui/components/label";
import { Switch } from "@know-meet/ui/components/switch";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { copyText } from "../../shared/copy-text";
import { initialsOf } from "../../workspace/application/format";
import type { Agent, CalendarSource } from "../../workspace/domain/workspace";
import type { DashboardMeetingStatus, DeliveryChannel, DeliveryStatus } from "../domain/dashboard";

type ViewTab = "upcoming" | "invites" | "schedule";

const TABS: readonly {
  readonly key: ViewTab;
  readonly label: string;
  readonly icon: KmIconName;
}[] = [
  { key: "upcoming", label: "Upcoming", icon: "calendar" },
  { key: "invites", label: "Invites", icon: "send" },
  { key: "schedule", label: "Schedule", icon: "plus" },
];

/** km.css `.tabs` of links (aria-current), dashboard.html `dashTabs`. */
export function DashTabs({ active }: { readonly active: ViewTab }) {
  return (
    <nav
      aria-label="Meetings sections"
      className="-mt-s2 mb-s5 flex gap-s1 overflow-x-auto [scrollbar-width:none]"
    >
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          to="/dashboard"
          hash={tab.key}
          aria-current={tab.key === active ? "page" : undefined}
          className={cn(
            "inline-flex min-h-size-target flex-none items-center gap-1.5 rounded-pill px-s3 text-sm font-semibold whitespace-nowrap text-muted-foreground no-underline transition-colors duration-(--dur-fast)",
            "aria-[current=page]:bg-selected aria-[current=page]:text-on-selected [@media(hover:hover)]:hover:not-aria-[current=page]:bg-card-hov [@media(hover:hover)]:hover:not-aria-[current=page]:text-foreground",
            focusFillClass,
          )}
        >
          <KmIcon name={tab.icon} className="size-4" />
          <span>{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}

/** dashboard.html `crumbsTo`: Meetings › <label> (truncated at 40ch). */
export function MeetingsCrumbs({ label }: { readonly label: string }) {
  return (
    <Breadcrumb className="mb-s2">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link to="/dashboard" hash="upcoming" />}>
            Meetings
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <KmIcon name="chevron-right" className="size-3.5" />
        </BreadcrumbSeparator>
        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage
            title={label}
            className="block max-w-[40ch] truncate text-muted-foreground"
          >
            {label}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

const SOURCE: Readonly<Record<CalendarSource, string>> = {
  google: "Google Calendar",
  outlook: "Outlook",
  knowme: "KnowMe",
};

export function SourceChip({ source }: { readonly source: CalendarSource }) {
  return (
    <Badge variant={source === "knowme" ? "ember" : "default"}>
      <KmIcon name={source === "knowme" ? "dot" : "calendar"} />
      <span>{SOURCE[source]}</span>
    </Badge>
  );
}

const CHANNEL: Readonly<Record<DeliveryChannel, readonly [KmIconName, string]>> = {
  email: ["mail", "Email"],
  sms: ["sms", "SMS"],
  calendar: ["calendar", "Calendar"],
};

export function ChannelChip({ channel }: { readonly channel: DeliveryChannel }) {
  const [icon, label] = CHANNEL[channel];
  return (
    <Badge>
      <KmIcon name={icon} />
      <span>{label}</span>
    </Badge>
  );
}

const STATUS: Readonly<
  Record<
    DeliveryStatus,
    { variant: "green" | "amber" | "red" | "default"; icon: KmIconName; label: string }
  >
> = {
  delivered: { variant: "green", icon: "check", label: "Delivered" },
  opened: { variant: "green", icon: "eye", label: "Opened" },
  queued: { variant: "amber", icon: "clock", label: "Queued" },
  sent: { variant: "default", icon: "send", label: "Sent" },
  failed: { variant: "red", icon: "alert", label: "Failed" },
};

export function StatusChip({ status }: { readonly status: DeliveryStatus }) {
  const s = STATUS[status];
  return (
    <Badge variant={s.variant}>
      <KmIcon name={s.icon} />
      <span>{s.label}</span>
    </Badge>
  );
}

/** "Failed · email sent instead" — the resolved landline SMS. */
export function ResolvedByEmailChip({ label }: { readonly label: string }) {
  return (
    <Badge>
      <KmIcon name="mail" />
      <span>{label}</span>
    </Badge>
  );
}

export function MeetingStatusChip({ status }: { readonly status: DashboardMeetingStatus }) {
  if (status === "live") {
    return (
      <Badge variant="ember">
        <BadgePip />
        <span>Live now</span>
      </Badge>
    );
  }
  const map = {
    ended: { variant: "default", icon: "check", label: "Ended" },
    cancelled: { variant: "red", icon: "x", label: "Cancelled" },
    upcoming: { variant: "green", icon: "clock", label: "Upcoming" },
  } as const;
  const s = map[status];
  return (
    <Badge variant={s.variant}>
      <KmIcon name={s.icon} />
      <span>{s.label}</span>
    </Badge>
  );
}

/** "Connected" with a status pip (km.css `.chip-green .pip`). */
export function ConnectedChip() {
  return (
    <Badge variant="green">
      <BadgePip />
      <span>Connected</span>
    </Badge>
  );
}

/** km.css `.meta-item`: 16px icon + 14px sub text, no wrap. */
export function MetaItem({
  icon,
  children,
  title,
}: {
  readonly icon?: KmIconName;
  readonly children: React.ReactNode;
  readonly title?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap text-muted-foreground"
      title={title}
    >
      {icon ? <KmIcon name={icon} className="size-4" /> : null}
      {children}
    </span>
  );
}

/** dashboard.html `avatarStack`: up to three 32px initials, 4px apart, then the count. */
export function AvatarStack({ names }: { readonly names: readonly string[] }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap text-muted-foreground">
      <span className="inline-flex gap-1" aria-hidden="true">
        {names.slice(0, 3).map((name) => (
          <Avatar key={name} size="sm">
            <AvatarFallback>{initialsOf(name)}</AvatarFallback>
          </Avatar>
        ))}
      </span>
      <span title={names.join(", ")}>
        {names.length} {names.length === 1 ? "invitee" : "invitees"}
      </span>
    </span>
  );
}

export function AgentChips({ agents }: { readonly agents: readonly Agent[] }) {
  return agents
    .filter((agent) => agent.id !== "concierge")
    .map((agent) => (
      <Badge key={agent.id} variant="cyan">
        <KmIcon name="agent-add" />
        <span>{agent.name}</span>
      </Badge>
    ));
}

export function CopyLinkButton({
  url,
  title,
  size = "sm",
}: {
  readonly url: string;
  readonly title: string;
  readonly size?: "sm" | "default";
}) {
  return (
    <Button
      variant="secondary"
      size={size}
      aria-label={`Copy join link for ${title}`}
      onClick={() => void copyText(url)}
    >
      <KmIcon name="link" className="size-4" />
      <span>Copy link</span>
    </Button>
  );
}

interface SwitchRowProps {
  readonly id: string;
  readonly label: string;
  readonly hint?: React.ReactNode;
  readonly checked: boolean;
  readonly disabled?: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
  readonly children?: React.ReactNode;
}

/** km.css `.switch-row`: label and hint on the left, the switch on the right. */
export function SwitchRow({
  id,
  label,
  hint,
  checked,
  disabled,
  onCheckedChange,
  children,
}: SwitchRowProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-s4 py-s3">
      <div className="grid gap-0.5 *:block">
        <Label htmlFor={id} className="block cursor-pointer text-sm font-semibold">
          {label}
        </Label>
        {hint ? <span className="text-sm text-muted-foreground">{hint}</span> : null}
        {children}
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

/** km.css `.state-line` + `.state-glyph`: round green pip = online, filled square = offline. */
export function StateLine({
  status,
  label,
  className,
}: {
  readonly status: "online" | "offline";
  readonly label: string;
  readonly className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-2 text-xs font-semibold", className)}
      data-state={status}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex-none",
          status === "online" ? "size-2.5 rounded-round bg-pip-green" : "size-size-pip bg-fg-sub",
        )}
      />
      <span>{label}</span>
    </span>
  );
}

/** Inline text link to another screen (km.css `a.small`; colour and underline come from the base `a` rule). */
export const smallLinkClass = "text-sm";

/** dashboard.html `busy()`: the refresh icon spins while an action runs; still under reduced motion. */
export const busySpinClass =
  "animate-spin [animation-duration:var(--anim-spin-fast)] motion-reduce:animate-none";
