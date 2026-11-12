// TJ-ARCH-MOB-001 compliant
// index.html `.sec-head`: eyebrow and h2 on the left (5fr), the intro on the
// right (7fr), bottom-aligned; one column below 1024px.
import type * as React from "react";
import { eyebrowClass } from "../public-shared/ui-classes";

interface SectionHeadProps {
  readonly id: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly children: React.ReactNode;
}

export function SectionHead({ id, eyebrow, title, children }: SectionHeadProps) {
  return (
    <div className="mb-s6 grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-end gap-x-s7 gap-y-s5 max-bp1024:grid-cols-[minmax(0,1fr)] max-bp1024:items-start">
      <div>
        <span className={`${eyebrowClass} mb-s3`}>{eyebrow}</span>
        <h2 id={id} className="max-w-[18ch] text-2xl">
          {title}
        </h2>
      </div>
      <p className="max-w-[58ch] text-muted-foreground">{children}</p>
    </div>
  );
}
