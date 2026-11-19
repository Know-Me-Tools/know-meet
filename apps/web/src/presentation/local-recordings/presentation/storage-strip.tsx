// TJ-ARCH-MOB-001 compliant
// The "Browser storage" strip (shape recordings-library.md §5-§7, RL-3): a `panel` card
// with the space this site uses and may use (`storage.estimate()`, approximate, hence
// "About"), a meter (`muted` track; fill `meter-fill` under 80%, `amber` to 95%, `red`
// above, and the text changes with the band, so colour is never alone) and whether the
// browser may clear recordings. "Keep recordings" asks `navigator.storage.persist()`
// from the click; the button goes once the browser answered, and the line says what it
// answered (a polite live line; focus moves to it, since the button that held focus is
// gone). Stacks below 768 (text, meter, button).
import { Button } from "@know-meet/ui/components/button";
import { cardVariants } from "@know-meet/ui/components/card";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { Spinner } from "@know-meet/ui/components/spinner";
import { cn } from "@know-meet/ui/lib/utils";
import { useId, useRef, useState } from "react";
import { useRecordingStorage } from "../../../app/recordings/hooks";
import { formatBytes } from "../../workspace/application/format";
import { type StorageBand, storageUse } from "../application/recording-format";

const BAND_FILL: Readonly<Record<StorageBand, string>> = {
  ok: "bg-meter-fill",
  high: "bg-amber",
  full: "bg-red",
};

const BAND_WORDS: Readonly<Record<StorageBand, string>> = {
  ok: "",
  high: "Getting full.",
  full: "Almost full.",
};

function Meter({
  usedBytes,
  quotaBytes,
}: {
  readonly usedBytes: number;
  readonly quotaBytes: number;
}) {
  const use = storageUse(usedBytes, quotaBytes);
  const words = BAND_WORDS[use.band];
  return (
    <>
      <div
        role="img"
        aria-label={`${formatBytes(usedBytes)} used of about ${formatBytes(quotaBytes)} available.${words === "" ? "" : ` ${words}`}`}
        className="h-2.5 overflow-hidden rounded-pill bg-muted"
      >
        <span
          aria-hidden="true"
          className={cn("block h-full rounded-[inherit]", BAND_FILL[use.band])}
          style={{ width: `${use.percent}%` }}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        <span className="whitespace-nowrap">{formatBytes(usedBytes)}</span> used by Know Meet in
        this browser. About <span className="whitespace-nowrap">{formatBytes(quotaBytes)}</span>{" "}
        available to this site.
        {words === "" ? null : <strong className="font-semibold text-foreground"> {words}</strong>}
      </p>
    </>
  );
}

type PersistAnswer = "none" | "asked";

export function StorageStrip() {
  const headingId = useId();
  const { info, requestPersistence, requesting } = useRecordingStorage();
  const [answer, setAnswer] = useState<PersistAnswer>("none");
  const lineRef = useRef<HTMLParagraphElement>(null);
  const persisted = info?.persisted ?? false;

  const onKeep = () => {
    void requestPersistence().then(() => {
      setAnswer("asked");
      requestAnimationFrame(() => lineRef.current?.focus({ preventScroll: true }));
    });
  };

  const persistLine = persisted
    ? "Protected from automatic clearing."
    : answer === "asked"
      ? "The browser didn't allow this. Download recordings you want to keep."
      : "The browser may clear recordings if the device runs low on space.";

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={info === null ? true : undefined}
      className={cn(
        cardVariants({ variant: "panel" }),
        "mb-s6 grid-cols-[minmax(0,1fr)_auto] items-center max-bp768:grid-cols-[minmax(0,1fr)]",
      )}
    >
      <div className="grid min-w-0 gap-s2">
        <h2 id={headingId} className="text-base">
          Browser storage
        </h2>
        {info === null ? (
          <p className="text-sm text-muted-foreground">Checking how much space this browser has…</p>
        ) : info.usedBytes !== null && info.quotaBytes !== null ? (
          <Meter usedBytes={info.usedBytes} quotaBytes={info.quotaBytes} />
        ) : (
          <p className="text-sm text-muted-foreground">
            This browser doesn't say how much space is free.
          </p>
        )}
        {info === null ? null : (
          <p
            ref={lineRef}
            tabIndex={-1}
            aria-live="polite"
            className="flex items-start gap-s2 text-sm outline-none"
          >
            <KmIcon
              name={persisted ? "shield" : "info"}
              className="mt-px size-4 text-muted-foreground"
            />
            <span>{persistLine}</span>
          </p>
        )}
      </div>
      {info === null || persisted || answer === "asked" ? null : (
        <Button
          type="button"
          variant="secondary"
          disabled={requesting}
          focusableWhenDisabled
          onClick={onKeep}
        >
          {requesting ? (
            <Spinner
              aria-hidden="true"
              role="presentation"
              className="motion-reduce:animate-none"
            />
          ) : (
            <KmIcon name="shield" />
          )}
          <span>Keep recordings</span>
        </Button>
      )}
    </section>
  );
}
