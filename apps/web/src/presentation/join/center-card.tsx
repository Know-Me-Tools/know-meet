// TJ-ARCH-MOB-001 compliant
// join.html `.center-card` (waiting, expired, wrong code), its state `.badge`
// tile and the `.options` list of next steps.
import { KmIcon, type KmIconName } from "@know-meet/ui/components/km-icon";
import { cn } from "@know-meet/ui/lib/utils";
import type * as React from "react";

export function CenterCard({ labelledBy, children }: { readonly labelledBy: string; readonly children: React.ReactNode }) {
  return (
    <section
      aria-labelledby={labelledBy}
      className="mx-auto mt-s6 grid w-[min(100%,580px)] justify-items-center gap-s4 rounded-lg bg-surface px-s6 py-s7 text-center shadow-(--shadow-card) max-bp768:px-s4 max-bp768:py-s6 [&>p]:max-w-[46ch] [&>p]:text-muted-foreground"
    >
      {children}
    </section>
  );
}

export function StateBadge({ icon, tone }: { readonly icon: KmIconName; readonly tone: "warn" | "error" }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "grid size-16 place-items-center rounded-[18px]",
        tone === "warn" ? "bg-amber-soft text-amber-text" : "bg-red-soft text-red-text",
      )}
    >
      <KmIcon name={icon} className="size-7" />
    </div>
  );
}

export function OptionList({ children }: { readonly children: React.ReactNode }) {
  return <ul className="m-0 grid w-full list-none gap-s2 p-0 text-left">{children}</ul>;
}

interface OptionItemProps {
  readonly icon: KmIconName;
  readonly title: string;
  readonly detail?: string;
  readonly action?: React.ReactNode;
}

export function OptionItem({ icon, title, detail, action }: OptionItemProps) {
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-s3 rounded-base bg-card p-s4">
      <KmIcon name={icon} className="mt-0.5 text-ember-text" />
      <div>
        <strong className="block">{title}</strong>
        {detail === undefined ? null : <span className="mt-0.5 block text-sm text-muted-foreground">{detail}</span>}
        {action === undefined ? null : <span className="text-sm font-semibold">{action}</span>}
      </div>
    </li>
  );
}
