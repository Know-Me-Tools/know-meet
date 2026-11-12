// TJ-ARCH-MOB-001 compliant
// Shared presentational parts of the agents screen, composed from the kit and
// token utilities (agents.html helpers: crumbs, pageHead, statusChip, stateLine,
// notice, .sec-head, .list-row, inline code).
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
import {
  PageActions,
  PageEyebrow,
  PageHead,
  PageHeadText,
  PageSub,
  PageTitle,
} from "@know-meet/ui/components/page-head";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { Fragment } from "react";
import type * as React from "react";

export interface Crumb {
  readonly label: string;
  /** Hash on /agents (e.g. "registry"), or "/" for the home page. */
  readonly to?: string;
}

function CrumbLink({ crumb }: { readonly crumb: Crumb & { readonly to: string } }) {
  const link = crumb.to === "/" ? <Link to="/" /> : <Link to="/agents" hash={crumb.to} />;
  return <BreadcrumbLink render={link}>{crumb.label}</BreadcrumbLink>;
}

export function Crumbs({ items }: { readonly items: readonly Crumb[] }) {
  return (
    <Breadcrumb className="mb-s2">
      <BreadcrumbList>
        {items.map((crumb, index) => (
          <Fragment key={`${crumb.label}-${index}`}>
            {index > 0 ? (
              <BreadcrumbSeparator>
                <KmIcon name="chevron-right" className="size-3.5" />
              </BreadcrumbSeparator>
            ) : null}
            <BreadcrumbItem>
              {crumb.to === undefined ? (
                <BreadcrumbPage className="text-muted-foreground">{crumb.label}</BreadcrumbPage>
              ) : (
                <CrumbLink crumb={{ ...crumb, to: crumb.to }} />
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

interface AgentsPageHeadProps {
  readonly crumbs?: readonly Crumb[];
  readonly eyebrow?: string;
  readonly title: string;
  readonly lede?: string;
  readonly actions?: React.ReactNode;
}

/** agents.html `pageHead`: crumbs, eyebrow, h1, lede (`.lede`: text-lg, 62ch), actions. */
export function AgentsPageHead({ crumbs, eyebrow, title, lede, actions }: AgentsPageHeadProps) {
  return (
    <PageHead className="max-bp768:mb-s5 max-bp768:items-start">
      <PageHeadText>
        {crumbs === undefined ? null : <Crumbs items={crumbs} />}
        {eyebrow === undefined ? null : <PageEyebrow>{eyebrow}</PageEyebrow>}
        <PageTitle>{title}</PageTitle>
        {lede === undefined ? null : <PageSub className="max-w-[62ch] text-lg">{lede}</PageSub>}
      </PageHeadText>
      {actions === undefined ? null : <PageActions>{actions}</PageActions>}
    </PageHead>
  );
}

/** Online: green chip + pip. Offline: muted chip + hollow pip. Text always names the state. */
export function StatusChip({ status }: { readonly status: "online" | "offline" }) {
  if (status === "online") {
    return (
      <Badge variant="green">
        <BadgePip />
        Online
      </Badge>
    );
  }
  return (
    <Badge>
      <span aria-hidden="true" className="size-size-pip flex-none bg-fg-sub" />
      Offline
    </Badge>
  );
}

/** Dot status: Active (green) or Paused (amber), with a pip and the word. */
export function DotStatusChip({ paused }: { readonly paused: boolean }) {
  return paused ? (
    <Badge variant="amber">
      <BadgePip />
      Paused
    </Badge>
  ) : (
    <Badge variant="green">
      <BadgePip />
      Active
    </Badge>
  );
}

/** km.css `.state-line`: shape + colour + words (round green = live, filled square = not live). */
export function StateLine({ status, children }: { readonly status: "online" | "offline"; readonly children: React.ReactNode }) {
  return (
    <span data-state={status} className="inline-flex items-center gap-2 text-sm font-semibold">
      <span
        aria-hidden="true"
        className={cn(
          "flex-none",
          status === "online" ? "size-2.5 rounded-round bg-pip-green" : "size-size-pip bg-muted-foreground",
        )}
      />
      {children}
    </span>
  );
}

type NoticeTone = "info" | "warn" | "danger";

const noticeFill: Readonly<Record<NoticeTone, string>> = {
  info: "bg-cyan-soft [&>svg]:text-cyan-text",
  warn: "bg-amber-soft [&>svg]:text-amber-text",
  danger: "bg-red-soft [&>svg]:text-red-text",
};

/** agents.html `.notice`: soft fill, leading icon, then a grid of copy (strong title first). */
export function Notice({
  tone = "info",
  icon,
  children,
}: {
  readonly tone?: NoticeTone;
  readonly icon: KmIconName;
  readonly children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-s3 rounded-base px-s4 py-s3 text-sm text-foreground [&>svg]:mt-px",
        noticeFill[tone],
      )}
    >
      <KmIcon name={icon} />
      <div className="grid min-w-0 gap-s1">{children}</div>
    </div>
  );
}

/** km.css `code:not(.code)`. */
export function InlineCode({ children }: { readonly children: React.ReactNode }) {
  return (
    <code className="rounded-6 bg-muted px-1.5 py-px font-mono text-[0.88em] [overflow-wrap:anywhere]">{children}</code>
  );
}

/** agents.html `.sec-head`: title + sub copy, optional trailing action. */
export function SectionHead({
  id,
  title,
  sub,
  action,
}: {
  readonly id: string;
  readonly title: string;
  readonly sub?: React.ReactNode;
  readonly action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-s4 gap-y-s2">
      <div className="grid min-w-0 gap-0.5">
        <h2 id={id} className="text-xl">
          {title}
        </h2>
        {sub === undefined ? null : <p className="text-sm text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/** Interactive surfaces: focus fills the whole row/card and inner fills drop out (km.css 7b). */
export const wholeFocusClass =
  "outline-none focus-visible:bg-focus! focus-visible:text-on-focus! focus-visible:**:bg-transparent! focus-visible:**:text-inherit! focus-visible:**:shadow-none!";

/** km.css `.list-row` (a link row): glyph, body, trail; the trail wraps under 768px. */
export const listRowClass = cn(
  "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-s3 rounded-base bg-surface px-s4 py-s3 text-inherit no-underline shadow-(--shadow-card) transition-colors duration-(--dur-fast) [@media(hover:hover)]:hover:bg-card-hov max-bp768:grid-cols-[auto_minmax(0,1fr)]",
  wholeFocusClass,
);

export const rowTrailClass =
  "flex flex-wrap items-center justify-end gap-s2 max-bp768:col-span-full max-bp768:justify-start";

export function RowChevron() {
  return <KmIcon name="chevron-right" className="text-muted-foreground" />;
}

/** km.css `.kv` definition list; `plain` rows use the body face. */
export function KeyValues({ rows }: { readonly rows: readonly (readonly [string, React.ReactNode, "mono" | "plain"])[] }) {
  return (
    <dl className="m-0 grid grid-cols-[minmax(120px,max-content)_minmax(0,1fr)] gap-x-s5 gap-y-s2 max-bp768:grid-cols-[minmax(0,1fr)] max-bp768:gap-0.5">
      {rows.map(([term, value, face]) => (
        <Fragment key={term}>
          <dt className="pt-0.5 text-sm text-muted-foreground max-bp768:[&:not(:first-child)]:mt-s3">{term}</dt>
          <dd
            className={cn(
              "m-0 min-w-0 [overflow-wrap:anywhere]",
              face === "mono" ? "font-mono text-13" : "font-body text-sm",
            )}
          >
            {value}
          </dd>
        </Fragment>
      ))}
    </dl>
  );
}

export function NotSet() {
  return <span className="text-muted-foreground">Not set</span>;
}

/** km.css `.masked`. */
export function Masked() {
  return (
    <span className="font-mono text-13 tracking-[0.18em] whitespace-nowrap text-muted-foreground select-none">
      ••••••••••••
    </span>
  );
}
