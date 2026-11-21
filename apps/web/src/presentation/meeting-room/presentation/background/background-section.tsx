// TJ-ARCH-MOB-001 compliant
// The Background section of the room's "Audio and video" pane (wc07 task 7.3; WC-4,
// WC-13; background-effects shape). A radio group named by its "Background" heading with
// five choice cards: None, Blur, Ground, Dusk, Tide. Each card is the radio's label: a
// 16:9 thumbnail (decorative, `alt=""`) or a glyph on `tile`, the radio indicator on a
// `surface` chip at the top-start corner, the name under it. One tab stop, arrows move and
// select (kit RadioGroup). Rest `surface`, hover `card-hov`, checked `ember-soft` with the
// indicator dot (state never fill alone), keyboard focus fills the whole card with `focus`
// and inverts the indicator so its state stays visible (DESIGN.md choice card). Under it,
// one polite status line: loading (spinner, or the static clock under reduced motion),
// camera off, or the failure. Without a camera the group is disabled with the reason; a
// browser that cannot run effects gets a note instead of the group. While shown with the
// camera on, the section prepares the processor ("Preparing background effects…", repair 9),
// so the first choice does not freeze the page; choices stay available meanwhile.
// Scenario contract: radiogroup "Background", km-effect-off, km-effect-blur,
// km-effect-image-option, km-effect-status (data-state = the status), km-effect-unavailable.
import type { ConferencingUseCases } from "@know-meet/application";
import type { BackgroundEffectState, Support } from "@know-meet/domain";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { RadioGroup, RadioGroupItem } from "@know-meet/ui/components/radio-group";
import { Spinner } from "@know-meet/ui/components/spinner";
import { cn } from "@know-meet/ui/lib/utils";
import type { Announce } from "../../../guest-meeting/live-status";
import { sectionHeadingClass } from "../device-settings/audio-section";
import { BACKGROUND_COPY } from "./background-copy";
import { BACKGROUND_CHOICES, type BackgroundChoice } from "./background-options";
import { type BackgroundStatus, useBackgroundChoice } from "./use-background-choice";
import { usePrepareBackground } from "./use-prepare-background";

const HEADING_ID = "settings-background-heading";
const HINT_ID = "settings-background-hint";
const STATUS_ID = "settings-background-status";

const cardClass = cn(
  "group/card grid min-w-0 cursor-pointer content-start gap-s2 rounded-lg bg-surface p-s2 text-foreground",
  "transition-colors duration-(--dur-fast) ease-standard motion-reduce:transition-none",
  "has-data-checked:bg-ember-soft [@media(hover:hover)]:hover:not-has-data-checked:not-has-data-disabled:bg-card-hov",
  "has-[:focus-visible]:bg-focus! has-[:focus-visible]:text-on-focus!",
  "has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50",
);

/** Inside a focused card the indicator inverts so its state stays visible. */
const indicatorClass = "focus-visible:bg-on-focus! focus-visible:text-focus!";

function ChoiceCard({ choice }: { readonly choice: BackgroundChoice }) {
  return (
    <label className={cardClass}>
      <span className="relative block aspect-video overflow-hidden rounded-base bg-tile">
        {choice.thumbnail === null ? (
          <span className="grid size-full place-items-center text-fg-sub group-has-[:focus-visible]/card:text-on-focus">
            <KmIcon name={choice.id === "none" ? "cam" : "background"} />
          </span>
        ) : (
          <img
            src={choice.thumbnail}
            alt=""
            width={320}
            height={180}
            loading="lazy"
            decoding="async"
            className="block size-full object-cover"
          />
        )}
        <span className="absolute top-s1 left-s1 grid place-items-center rounded-pill bg-surface p-1 group-has-[:focus-visible]/card:bg-focus">
          <RadioGroupItem
            value={choice.id}
            aria-label={choice.accessibleName}
            data-testid={choice.testId}
            className={indicatorClass}
          />
        </span>
      </span>
      <span aria-hidden="true" className="truncate text-sm font-semibold">
        {choice.name}
      </span>
    </label>
  );
}

function StatusLine({ status }: { readonly status: BackgroundStatus }) {
  return (
    <p
      id={STATUS_ID}
      aria-live="polite"
      data-testid="km-effect-status"
      data-state={status}
      className={cn(
        "flex items-start gap-1.5 text-sm",
        status === "failed" ? "text-red-text" : "text-muted-foreground",
      )}
    >
      {status === "loading" || status === "preparing" ? (
        <>
          <Spinner aria-hidden="true" role="presentation" className="mt-0.5 motion-reduce:hidden" />
          <KmIcon name="clock" className="mt-0.5 hidden size-4 flex-none motion-reduce:block" />
          <span>{status === "loading" ? BACKGROUND_COPY.loading : BACKGROUND_COPY.preparing}</span>
        </>
      ) : status === "camera-off" ? (
        <span>{BACKGROUND_COPY.cameraOff}</span>
      ) : status === "failed" ? (
        <>
          <KmIcon name="alert" className="mt-0.5 size-4 flex-none" />
          <span>{BACKGROUND_COPY.failed}</span>
        </>
      ) : null}
    </p>
  );
}

interface BackgroundSectionProps {
  readonly state: BackgroundEffectState;
  readonly support: Support;
  /** The camera is publishing now. */
  readonly cameraOn: boolean;
  /** No camera to apply an effect to (blocked by the browser, or none connected). */
  readonly noCamera: boolean;
  readonly conferencing: ConferencingUseCases;
  readonly announce: Announce;
}

export function BackgroundSection({
  state,
  support,
  cameraOn,
  noCamera,
  conferencing,
  announce,
}: BackgroundSectionProps) {
  const supported = support === "supported";
  const preparing = usePrepareBackground(conferencing, supported && cameraOn && !noCamera);
  const choice = useBackgroundChoice(state, cameraOn, conferencing, announce, preparing);
  return (
    <section aria-labelledby={HEADING_ID} className="grid gap-s3 pt-s2">
      <h3 id={HEADING_ID} className={sectionHeadingClass}>
        {BACKGROUND_COPY.heading}
      </h3>
      {supported ? (
        <>
          <p id={HINT_ID} className="text-sm text-muted-foreground">
            {noCamera ? BACKGROUND_COPY.needsCamera : BACKGROUND_COPY.hint}
          </p>
          <RadioGroup
            aria-labelledby={HEADING_ID}
            aria-describedby={HINT_ID}
            aria-busy={
              choice.status === "loading" || choice.status === "preparing" ? true : undefined
            }
            aria-disabled={noCamera ? true : undefined}
            disabled={noCamera}
            value={choice.checked}
            onValueChange={(next) => {
              if (typeof next === "string") choice.choose(next);
            }}
            className="grid-cols-3 gap-s2 max-bp768:grid-cols-2"
          >
            {BACKGROUND_CHOICES.map((option) => (
              <ChoiceCard key={option.id} choice={option} />
            ))}
          </RadioGroup>
          <StatusLine status={choice.status} />
        </>
      ) : (
        <div
          data-testid="km-effect-unavailable"
          className="flex items-start gap-s2 rounded-base bg-surface p-s3 text-sm text-foreground"
        >
          <KmIcon name="info" className="mt-0.5 size-4 flex-none text-muted-foreground" />
          <span>{BACKGROUND_COPY.unsupported}</span>
        </div>
      )}
    </section>
  );
}
