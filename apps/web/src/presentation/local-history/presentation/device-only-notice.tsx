// TJ-ARCH-MOB-001 compliant
// Shape local-history.md §5, §7, LH-2: the D5 notice above the list. A `section`
// named by its heading, `surface` fill with the `shield` glyph in `fg-sub`. It holds
// no controls; the non-persistent line appears only when the browser has not granted
// persistent storage. Scenario contract: km-history-device-only.
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { cn } from "@know-meet/ui/lib/utils";
import { useId } from "react";

export const DEVICE_ONLY_TEXT =
  "History keeps the meetings you joined here and every chat message this browser received, including messages from other people. It is never uploaded or shared, and other people can't see it. Delete a meeting, or all history, at any time. Clearing this site's data in your browser also deletes it.";

export const NON_PERSISTENT_TEXT =
  "Your browser may clear this history if the device runs low on space.";

export function DeviceOnlyNotice({
  nonPersistent,
  className,
}: {
  readonly nonPersistent: boolean;
  readonly className?: string;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      data-testid="km-history-device-only"
      className={cn(
        "flex min-w-0 items-start gap-s3 rounded-base bg-surface px-s4 py-s4 text-foreground",
        className,
      )}
    >
      <KmIcon name="shield" className="mt-px shrink-0 text-muted-foreground" />
      <div className="grid min-w-0 gap-s2">
        <h2 id={headingId} className="m-0 text-base leading-heading font-semibold">
          Saved only in this browser
        </h2>
        <p className="m-0 max-w-[72ch] text-sm text-pretty">{DEVICE_ONLY_TEXT}</p>
        {nonPersistent ? <p className="m-0 text-sm font-semibold">{NON_PERSISTENT_TEXT}</p> : null}
      </div>
    </section>
  );
}
