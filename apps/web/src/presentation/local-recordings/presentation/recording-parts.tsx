// TJ-ARCH-MOB-001 compliant
// Small parts of the local recordings screens (shape recordings-library.md §5, §6,
// RL-8): the format and condition chips (kit Badge: icon and text, never colour alone)
// and the condition note in the detail, static text with an `alert` glyph on a `-soft`
// fill (not role="alert"; it describes the file, it is not an event).
import { Badge } from "@know-meet/ui/components/badge";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { cn } from "@know-meet/ui/lib/utils";
import type * as React from "react";
import { formatName, type RecordingCondition } from "../application/recording-format";

export function FormatChip({ mimeType }: { readonly mimeType: string }) {
  return <Badge>{formatName(mimeType)}</Badge>;
}

const CONDITION_CHIP: Partial<
  Record<RecordingCondition, { readonly label: string; readonly tone: "amber" | "red" }>
> = {
  "stopped-early": { label: "Incomplete", tone: "amber" },
  incomplete: { label: "Incomplete", tone: "red" },
  unusable: { label: "Recording failed", tone: "red" },
  missing: { label: "File missing", tone: "red" },
};

export function ConditionChip({ condition }: { readonly condition: RecordingCondition }) {
  const chip = CONDITION_CHIP[condition];
  if (chip === undefined) return null;
  return (
    <Badge
      variant={chip.tone}
      className={chip.tone === "amber" ? "text-amber-text" : "text-red-text"}
    >
      <KmIcon name="alert" />
      <span>{chip.label}</span>
    </Badge>
  );
}

export function ChipRow({ children }: { readonly children: React.ReactNode }) {
  return <span className="flex flex-wrap gap-1.5">{children}</span>;
}

export function ConditionNote({
  tone,
  children,
}: {
  readonly tone: "amber" | "red";
  readonly children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-s3 rounded-base px-s4 py-s3 text-sm text-foreground",
        tone === "amber" ? "bg-amber-soft" : "bg-red-soft",
      )}
    >
      <KmIcon
        name="alert"
        className={cn("mt-px", tone === "amber" ? "text-amber-text" : "text-red-text")}
      />
      <p className="min-w-0">{children}</p>
    </div>
  );
}
