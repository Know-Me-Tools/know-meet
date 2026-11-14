// TJ-ARCH-MOB-001 compliant
// Small shared parts of the recordings screens: status chips (pip + text, never
// colour alone), the recording chip row, the `.note` callout, the `.meter` bar and
// the breadcrumb trail (recordings.html `chip`, `statusChip`, `recChips`, `note`,
// `crumbs`).
import { Badge, BadgePip } from "@know-meet/ui/components/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@know-meet/ui/components/breadcrumb";
import { KmIcon, type KmIconName } from "@know-meet/ui/components/km-icon";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { Fragment } from "react";
import type { Recording } from "../../workspace/domain/workspace";
import type { DeliveryStatus } from "../domain/recording-details";

type BadgeTone = "default" | "cyan" | "green" | "amber" | "red" | "ember";

const STATUS_TONE: Readonly<Record<DeliveryStatus, BadgeTone>> = {
  Delivered: "green",
  Opened: "cyan",
  Bounced: "red",
  "Held for review": "amber",
  "Sending…": "amber",
};

/** A delivery or pin status: soft fill plus pip plus words. */
export function StatusChip({ status }: { readonly status: string }) {
  const tone = status in STATUS_TONE ? STATUS_TONE[status as DeliveryStatus] : "default";
  return (
    <Badge variant={tone}>
      <BadgePip />
      <span>{status}</span>
    </Badge>
  );
}

export function IconChip({
  icon,
  tone = "default",
  className,
  children,
}: {
  readonly icon?: KmIconName;
  readonly tone?: BadgeTone;
  readonly className?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <Badge variant={tone} className={className}>
      {icon === undefined ? null : <KmIcon name={icon} />}
      <span>{children}</span>
    </Badge>
  );
}

export function RecordingChips({ recording }: { readonly recording: Recording }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <IconChip icon="cc" tone="cyan">
        Transcript
      </IconChip>
      {recording.summarySent ? (
        <IconChip icon="check" tone="green">
          Summary sent
        </IconChip>
      ) : (
        <IconChip icon="clock" tone="amber">
          Summary held
        </IconChip>
      )}
      {recording.storage === "byo" ? (
        <IconChip icon="database">Your bucket</IconChip>
      ) : (
        <IconChip icon="cloud">KnowMe-managed</IconChip>
      )}
      <IconChip icon="globe">IPFS pinned</IconChip>
    </div>
  );
}

type NoteKind = "info" | "warn" | "ok" | "err";

const NOTE_FILL: Readonly<Record<NoteKind, string>> = {
  info: "bg-cyan-soft [&>[data-slot=km-icon]]:text-cyan-text",
  warn: "bg-amber-soft [&>[data-slot=km-icon]]:text-amber-text",
  ok: "bg-green-soft [&>[data-slot=km-icon]]:text-green-text",
  err: "bg-red-soft [&>[data-slot=km-icon]]:text-red-text",
};

/** km.css-local `.note`: icon + copy on a soft fill; errors are alerts. */
export function Note({
  kind,
  icon,
  role,
  children,
}: {
  readonly kind: NoteKind;
  readonly icon: KmIconName;
  readonly role?: "alert" | "status";
  readonly children: React.ReactNode;
}) {
  return (
    <div
      role={role ?? (kind === "err" ? "alert" : undefined)}
      className={cn(
        "flex items-start gap-s3 rounded-base px-s4 py-s3 text-sm text-foreground",
        NOTE_FILL[kind],
      )}
    >
      <KmIcon name={icon} className="mt-px" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** recordings.html `.meter`: 10px muted track with an ember (or cyan) fill. */
export function MeterBar({
  percent,
  className,
}: {
  readonly percent: number;
  readonly className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("block h-full rounded-[inherit] bg-ember-btn", className)}
      style={{ width: `${percent}%` }}
    />
  );
}

export const meterTrackClass = "h-2.5 overflow-hidden rounded-pill bg-muted";

export interface Crumb {
  readonly label: string;
  /** Hash on /recordings; absent for the current page. */
  readonly hash?: string;
}

export function RecordingsCrumbs({
  items,
  className,
}: {
  readonly items: readonly Crumb[];
  readonly className?: string;
}) {
  return (
    <Breadcrumb className={cn("mb-s2", className)}>
      <BreadcrumbList>
        {items.map((item, index) => (
          <Fragment key={item.label}>
            {index > 0 ? (
              <BreadcrumbSeparator>
                <KmIcon name="chevron-right" className="size-3.5" />
              </BreadcrumbSeparator>
            ) : null}
            <BreadcrumbItem className="min-w-0">
              {item.hash === undefined ? (
                <BreadcrumbPage className="text-muted-foreground">{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<Link to="/recordings" hash={item.hash} />}>
                  {item.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
