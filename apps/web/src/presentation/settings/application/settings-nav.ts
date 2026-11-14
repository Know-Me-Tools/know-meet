// TJ-ARCH-MOB-001 compliant
// settings.html NAV / ACTIVE_ALIAS / groupOf: three groups of section links; a
// sub-page (calendar connect, S3, IPFS, failed test) highlights its parent.
import type { SettingsNavKey, SettingsSection } from "../domain/settings";

export interface SettingsNavItem {
  readonly key: SettingsNavKey;
  readonly label: string;
}

export interface SettingsNavGroup {
  readonly label: string;
  readonly items: readonly SettingsNavItem[];
}

export const SETTINGS_NAV: readonly SettingsNavGroup[] = [
  {
    label: "Account",
    items: [
      { key: "account", label: "Account" },
      { key: "notifications", label: "Notifications" },
    ],
  },
  {
    label: "Connections",
    items: [
      { key: "livekit", label: "LiveKit" },
      { key: "telnyx-sms", label: "Telnyx SMS" },
      { key: "telnyx-voice", label: "Telnyx voice dial-in" },
      { key: "calendars", label: "Calendars" },
    ],
  },
  {
    label: "Recording",
    items: [
      { key: "storage", label: "Storage" },
      { key: "recording", label: "Recording & transcription" },
      { key: "delivery", label: "Summary delivery" },
      { key: "templates", label: "Message templates" },
    ],
  },
];

const SECTIONS: readonly SettingsSection[] = [
  "account",
  "notifications",
  "livekit",
  "telnyx-sms",
  "telnyx-voice",
  "calendars",
  "calendar-connect",
  "storage",
  "storage-s3",
  "storage-ipfs",
  "storage-test-failed",
  "recording",
  "delivery",
  "templates",
];

/** Unknown or empty hash views fall back to Account (km.js `route(handlers, 'account')`). */
export function resolveSection(view: string): SettingsSection {
  return SECTIONS.find((section) => section === view) ?? "account";
}

export function activeNavKey(section: SettingsSection): SettingsNavKey {
  switch (section) {
    case "calendar-connect":
      return "calendars";
    case "storage-s3":
    case "storage-ipfs":
    case "storage-test-failed":
      return "storage";
    default:
      return section;
  }
}

export function groupLabelOf(section: SettingsSection): string {
  const key = activeNavKey(section);
  return (
    SETTINGS_NAV.find((group) => group.items.some((item) => item.key === key))?.label ?? "Settings"
  );
}
