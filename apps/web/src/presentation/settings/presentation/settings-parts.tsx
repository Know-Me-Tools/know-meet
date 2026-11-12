// TJ-ARCH-MOB-001 compliant
// settings.html building blocks: `.panel` + `.panel-head`, `.note-*` callouts,
// status chips (pip + text, never colour alone), `.kv` lists, `.cred` rows,
// `.form-foot` and the required note. Flat 2.0: regions separate by fill only.
import { Badge, BadgePip } from "@know-meet/ui/components/badge";
import { KmIcon, type KmIconName } from "@know-meet/ui/components/km-icon";
import { cn } from "@know-meet/ui/lib/utils";
import type * as React from "react";
import { useId } from "react";

interface PanelProps extends Omit<React.ComponentProps<"section">, "title"> {
  readonly title: React.ReactNode;
  readonly description?: React.ReactNode;
  /** Trailing content in the panel head (a chip or a small button). */
  readonly trail?: React.ReactNode;
}

/** km.css `.panel` with settings.html `panel(title, desc, children, actions)`. */
export function Panel({ title, description, trail, className, children, ...props }: PanelProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-s4 rounded-lg bg-surface p-s5 shadow-(--shadow-card) max-bp768:p-s4",
        className,
      )}
      {...props}
    >
      <PanelHead>
        <div className="grid min-w-0 max-w-[64ch] gap-1">
          <h2 id={headingId} className="text-lg">
            {title}
          </h2>
          {description === undefined ? null : <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {trail}
      </PanelHead>
      {children}
    </section>
  );
}

export function PanelHead({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap items-start justify-between gap-s3", className)} {...props} />;
}

/** A bare `.panel` surface for custom heads (calendars, consent). */
export function PanelSurface({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-s4 rounded-lg bg-surface p-s5 shadow-(--shadow-card) max-bp768:p-s4",
        className,
      )}
      {...props}
    />
  );
}

type NoteKind = "info" | "warn" | "ok" | "err";

const NOTE_FILL: Readonly<Record<NoteKind, string>> = {
  info: "bg-cyan-soft [&>[data-slot=km-icon]]:text-cyan-text",
  warn: "bg-amber-soft [&>[data-slot=km-icon]]:text-amber-text",
  ok: "bg-green-soft [&>[data-slot=km-icon]]:text-green-text",
  err: "bg-red-soft [&>[data-slot=km-icon]]:text-red-text",
};

/** settings.html `note(kind, icon, children)`: an icon-led callout; errors are `role="alert"`. */
export function Note({
  kind,
  icon,
  className,
  children,
}: {
  readonly kind: NoteKind;
  readonly icon: KmIconName;
  readonly className?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div
      role={kind === "err" ? "alert" : undefined}
      className={cn(
        "flex items-start gap-s3 rounded-base px-s4 py-s3 text-sm text-foreground [&_a]:text-ember-text [&_a]:underline [&_a]:underline-offset-[3px]",
        NOTE_FILL[kind],
        className,
      )}
    >
      <KmIcon name={icon} className="mt-px" />
      <div className="grid min-w-0 gap-s2">{children}</div>
    </div>
  );
}

/** settings.html `stateChip(text, kind)`: soft fill, status pip and the words. */
export function StatusChip({ tone, children }: { readonly tone: "green" | "amber" | "red"; readonly children: React.ReactNode }) {
  return (
    <Badge variant={tone}>
      <BadgePip />
      <span>{children}</span>
    </Badge>
  );
}

/** settings.html `chip(text, '', icon)`: the neutral muted chip. */
export function NeutralChip({ icon, children }: { readonly icon?: KmIconName; readonly children: React.ReactNode }) {
  return (
    <Badge>
      {icon === undefined ? null : <KmIcon name={icon} />}
      <span>{children}</span>
    </Badge>
  );
}

/** km.css `.kv`: label / value pairs; values are mono unless `plain`. */
export function KeyValueList({ className, ...props }: React.ComponentProps<"dl">) {
  return (
    <dl
      className={cn(
        "m-0 grid grid-cols-[minmax(120px,max-content)_minmax(0,1fr)] gap-x-s5 gap-y-s2 max-bp768:grid-cols-[minmax(0,1fr)] max-bp768:gap-y-0.5 max-bp768:[&>dd+dt]:mt-s3",
        className,
      )}
      {...props}
    />
  );
}

export function KeyValue({ label, plain, children }: { readonly label: string; readonly plain?: "plain"; readonly children: React.ReactNode }) {
  return (
    <>
      <dt className="pt-0.5 text-sm text-muted-foreground">{label}</dt>
      <dd className={cn("m-0 min-w-0 [overflow-wrap:anywhere]", plain === "plain" ? "text-sm" : "font-mono text-13")}>{children}</dd>
    </>
  );
}

/** km.css `.masked`: a hidden value, announced by its label instead of the dots. */
export function Masked({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <span role="img" aria-label={label} className="font-mono text-13 tracking-[0.18em] whitespace-nowrap text-muted-foreground select-none">
      {children}
    </span>
  );
}

/** settings.html `.cred`: env var name, masked value, server-side chip. */
export function CredentialRow({ name }: { readonly name: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,max-content)_minmax(0,1fr)_auto] items-center gap-s3 rounded-base bg-bg-2 px-s4 py-s3 max-bp768:grid-cols-[minmax(0,1fr)_auto]">
      <code className="justify-self-start">{name}</code>
      <span className="max-bp768:col-span-full max-bp768:row-start-2">
        <Masked label="Hidden value">••••••••••••••••</Masked>
      </span>
      <NeutralChip icon="lock">Server-side</NeutralChip>
    </div>
  );
}

/** settings.html `.form-foot`. */
export function FormFoot({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap items-center gap-s2 pt-s2", className)} {...props} />;
}

export function RequiredNote() {
  return <span className="text-xs text-muted-foreground">* Required</span>;
}

/** km.css `.stack` (s4) / `.stack-sm` (s2). */
export function Stack({ gap = "md", className, ...props }: React.ComponentProps<"div"> & { readonly gap?: "md" | "sm" }) {
  return (
    <div
      className={cn("grid min-w-0 grid-cols-[minmax(0,1fr)] content-start", gap === "md" ? "gap-s4" : "gap-s2", className)}
      {...props}
    />
  );
}

/** km.css `.field-row`: two equal columns, one under 768px. */
export function FieldRow({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid grid-cols-2 gap-s4 max-bp768:grid-cols-[minmax(0,1fr)] *:min-w-0", className)} {...props} />;
}

/** settings.html `busy(btn, label)`: while busy the button shows a spinning refresh and the busy label. */
export function BusyContent({ busy, busyLabel, icon, children }: {
  readonly busy: boolean;
  readonly busyLabel: string;
  readonly icon?: KmIconName;
  readonly children: React.ReactNode;
}) {
  if (busy) {
    return (
      <>
        <KmIcon name="refresh" className="animate-spin [animation-duration:var(--anim-spin)] motion-reduce:animate-none" />
        <span>{busyLabel}</span>
      </>
    );
  }
  return (
    <>
      {icon === undefined ? null : <KmIcon name={icon} />}
      <span>{children}</span>
    </>
  );
}
