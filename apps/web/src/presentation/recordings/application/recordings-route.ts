// TJ-ARCH-MOB-001 compliant
// recordings.html router: `#library` (default), `#empty`, `#detail:<id>[:<tab>]`,
// `#processing:<id>`. Unknown views fall back to the library; an unknown tab
// falls back to the transcript (prototype behaviour).
import type { RecordingsView, RecordingTab } from "../domain/recording-details";

export interface TabSpec {
  readonly id: RecordingTab;
  readonly label: string;
  readonly icon: "cc" | "book" | "send" | "database";
}

export const RECORDING_TABS: readonly TabSpec[] = [
  { id: "transcript", label: "Transcript", icon: "cc" },
  { id: "summary", label: "Summary", icon: "book" },
  { id: "delivery", label: "Delivery", icon: "send" },
  { id: "storage", label: "Storage", icon: "database" },
];

export function isRecordingTab(value: string): value is RecordingTab {
  return RECORDING_TABS.some((tab) => tab.id === value);
}

export function tabLabel(tab: RecordingTab): string {
  return RECORDING_TABS.find((spec) => spec.id === tab)?.label ?? "Transcript";
}

export function resolveRecordingsView(view: string, arg: string | null): RecordingsView {
  if (view === "empty") return { kind: "empty" };
  if (view === "processing") return { kind: "processing", id: arg ?? "" };
  if (view === "detail") {
    const [id = "", tab = "transcript"] = (arg ?? "").split(":");
    return { kind: "detail", id, tab: isRecordingTab(tab) ? tab : "transcript" };
  }
  return { kind: "library" };
}

/** Hash for `<Link hash>` / `navigate({ hash })`. */
export function detailHash(id: string, tab?: RecordingTab): string {
  return tab === undefined ? `detail:${id}` : `detail:${id}:${tab}`;
}
