// TJ-ARCH-MOB-001 compliant
// Prototype icon set (docs/design/prototype/assets/km.js ICONS, generated from it
// verbatim): 24 viewBox outline family, 1.75 stroke, round caps and joins. Glyph
// strokes are part of the drawing, not control outlines (Flat 2.0 bans control
// strokes only). Decorative by default: the visible label or the control's
// aria-label names the action.
import type * as React from "react";
import { cn } from "#lib/utils";

const PATHS = {
  "mic": <><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  "mic-off": <path d="M15 9.5V6a3 3 0 0 0-5.7-1.3M9 9v3a3 3 0 0 0 4.6 2.5M5 11a7 7 0 0 0 11.4 5.4M19 11a7 7 0 0 1-.6 2.8M12 18v3M3 3l18 18" />,
  "cam": <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3" /></>,
  "cam-off": <path d="M10 6h4a2 2 0 0 1 2 2v4M16 16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2M16 10l5-3v10M3 3l18 18" />,
  "screen": <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4M12 13V7M9 10l3-3 3 3" /></>,
  "cc": <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10.5 10a2.5 2.5 0 1 0 0 4M17 10a2.5 2.5 0 1 0 0 4" /></>,
  "chat": <path d="M4 5h16v11H9l-5 4z" />,
  "book": <><path d="M4 19V5a2 2 0 0 1 2-2h14v14H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h14" /><path d="M9 7h7M9 11h5" /></>,
  "agent-add": <><rect x="3" y="7" width="12" height="11" rx="3" /><path d="M9 4v3M7 12h.01M11 12h.01M19 8v6M16 11h6" /></>,
  "dot": <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" /></>,
  "leave": <path d="M3 14.5c5-4.5 13-4.5 18 0l-1.8 2.8-3.7-1v-2.8c-2.9-.9-5.1-.9-7 0v2.8l-3.7 1z" />,
  "sun": <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  "moon": <path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z" />,
  "x": <path d="M6 6l12 12M18 6L6 18" />,
  "upload": <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />,
  "check": <path d="M5 12.5l4.5 4.5L19 7.5" />,
  "alert": <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></>,
  "pause": <path d="M9 5v14M15 5v14" />,
  "play": <path d="M7 4.5l12 7.5-12 7.5z" />,
  "trash": <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  "send": <path d="M4 12l16-8-6 16-3-7z" />,
  "lock": <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  "refresh": <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />,
  "remove": <><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></>,
  "plus": <path d="M12 5v14M5 12h14" />,
  "calendar": <><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  "mail": <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 6.5l8.5 6.5 8.5-6.5" /></>,
  "sms": <><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9h8M8 12.5h5" /></>,
  "phone": <path d="M5 4h3.5l1.5 4.5-2 1.5a11 11 0 0 0 6 6l1.5-2 4.5 1.5V19a1.5 1.5 0 0 1-1.5 1.5A16.5 16.5 0 0 1 3.5 5.5 1.5 1.5 0 0 1 5 4z" />,
  "phone-in": <><path d="M5 4h3.5l1.5 4.5-2 1.5a11 11 0 0 0 6 6l1.5-2 4.5 1.5V19a1.5 1.5 0 0 1-1.5 1.5A16.5 16.5 0 0 1 3.5 5.5 1.5 1.5 0 0 1 5 4z" /><path d="M21 3l-5.5 5.5M15 4v5h5" /></>,
  "link": <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  "copy": <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
  "record": <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" /></>,
  "stop": <rect x="6" y="6" width="12" height="12" rx="2" />,
  "download": <path d="M12 4v12M7 11l5 5 5-5M4 20h16" />,
  "cloud": <path d="M7 18.5a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 10a4.3 4.3 0 0 1-.5 8.5z" />,
  "database": <><ellipse cx="12" cy="5.5" rx="7.5" ry="2.5" /><path d="M4.5 5.5v13c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5v-13M4.5 12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5" /></>,
  "server": <><rect x="3.5" y="4" width="17" height="7" rx="2" /><rect x="3.5" y="13" width="17" height="7" rx="2" /><path d="M7.5 7.5h.01M7.5 16.5h.01M11 7.5h5M11 16.5h5" /></>,
  "key": <><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M16 7l3 3M14 9l2 2" /></>,
  "globe": <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  "settings": <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  "user": <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  "users": <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" /></>,
  "home": <path d="M3.5 11L12 4l8.5 7M6 9.5V20h12V9.5M10 20v-5h4v5" />,
  "film": <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" /></>,
  "clock": <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  "search": <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  "chevron-right": <path d="M9 5l7 7-7 7" />,
  "chevron-down": <path d="M5 9l7 7 7-7" />,
  "menu": <path d="M4 7h16M4 12h16M4 17h16" />,
  "external": <path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />,
  "shield": <path d="M12 3l7.5 3v6c0 4.5-3.2 7.8-7.5 9-4.3-1.2-7.5-4.5-7.5-9V6z" />,
  "wave": <path d="M3 10.5v3M7 8v8M11 4.5v15M15 8v8M19 10v4" />,
  "bolt": <path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" />,
  "info": <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5v.01" /></>,
  "edit": <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>,
  "log-out": <path d="M9 20H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h4M16 16l4-4-4-4M20 12H9" />,
  "eye": <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>,
  "eye-off": <path d="M10.6 5.6A9.8 9.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.6 6.6A16.6 16.6 0 0 0 2.5 12S6 18.5 12 18.5a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />,
  "filter": <path d="M4 5h16l-6 7.5V19l-4 1.5v-8z" />,
} as const satisfies Record<string, React.ReactNode>;

export type KmIconName = keyof typeof PATHS;

export const KM_ICON_NAMES = Object.keys(PATHS) as readonly KmIconName[];

interface KmIconProps extends Omit<React.ComponentProps<"svg">, "children"> {
  readonly name: KmIconName;
}

/** km.css `.ic` (20px) by default; size with `size-*` utilities (`.ic-sm` = size-4, `.ic-lg` = size-7). */
function KmIcon({ name, className, ...props }: KmIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-slot="km-icon"
      className={cn("size-5 flex-none", className)}
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}

export { KmIcon };
