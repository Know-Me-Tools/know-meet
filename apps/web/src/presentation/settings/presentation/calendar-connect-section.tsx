// TJ-ARCH-MOB-001 compliant
// settings.html `#calendar-connect:<provider>`: Google and Microsoft 365 walk
// through a static OAuth-style flow (consent → connecting → choose calendars, or
// cancelled); CalDAV is a credentials form; an unknown provider gets a clear
// not-found state with the way back.
import { Button, buttonVariants } from "@know-meet/ui/components/button";
import { Empty, EmptyMedia } from "@know-meet/ui/components/empty";
import { FieldError } from "@know-meet/ui/components/field";
import { KmIcon, type KmIconName } from "@know-meet/ui/components/km-icon";
import { Stepper, StepperItem } from "@know-meet/ui/components/stepper";
import { toast } from "@know-meet/ui/components/toast";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import type { SessionUserView } from "../../shared/session";
import { CALENDAR_PROVIDERS, isCalendarProvider } from "../application/settings-fixtures";
import type { CalendarProvider } from "../domain/settings";
import { CalDavSection } from "./caldav-form";
import { ProviderMark } from "./calendars-section";
import { CheckRow } from "./settings-fields";
import { SettingsLink } from "./settings-link";
import { Note, PanelSurface } from "./settings-parts";
import { SettingsHead } from "./settings-shell";
import { useLater } from "./use-static-delay";

type Phase = "consent" | "connecting" | "pick" | "cancelled";

const STEP_LABELS = ["Permissions", "Connect", "Choose calendars"] as const;
const PHASE_STEP: Readonly<Record<Phase, number>> = {
  consent: 0,
  connecting: 1,
  pick: 2,
  cancelled: 0,
};

const linkButton = (variant: "default" | "secondary") =>
  cn(buttonVariants({ variant }), focusFillClass);

function Permission({
  icon,
  title,
  children,
}: {
  readonly icon: KmIconName;
  readonly title: string;
  readonly children: string;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-s3 py-s3">
      <KmIcon name={icon} className="mt-0.5 text-ember-text" />
      <div>
        <b className="block">{title}</b>
        <span className="block text-sm text-muted-foreground">{children}</span>
      </div>
    </div>
  );
}

function PickCalendars({
  provider,
  email,
}: {
  readonly provider: CalendarProvider;
  readonly email: string;
}) {
  const [selected, setSelected] = useState<Readonly<Record<string, boolean>>>(() =>
    Object.fromEntries(provider.calendars.map((cal, i) => [cal.id, i < 2])),
  );
  const [showError, setShowError] = useState(false);
  const navigate = useNavigate();
  const legendId = useId();
  return (
    <>
      <Note kind="ok" icon="check">
        Signed in as {email}.
      </Note>
      <fieldset
        className="m-0 min-w-0 p-0"
        aria-labelledby={legendId}
        aria-describedby={showError ? "pick-err" : undefined}
      >
        <span id={legendId} className="mb-1.5 block text-sm font-semibold">
          Calendars to sync
        </span>
        {provider.calendars.map((cal) => (
          <CheckRow
            key={cal.id}
            id={`pick-${cal.id}`}
            label={cal.label}
            checked={selected[cal.id] === true}
            onCheckedChange={(checked) => {
              setSelected((current) => ({ ...current, [cal.id]: checked }));
              setShowError(false);
            }}
          />
        ))}
        {showError ? (
          <FieldError id="pick-err">Choose at least one calendar to sync.</FieldError>
        ) : null}
      </fieldset>
      <div className="flex flex-wrap items-center gap-s2">
        <Button
          onClick={() => {
            if (!Object.values(selected).some(Boolean)) {
              setShowError(true);
              document.getElementById(`pick-${provider.calendars[0]?.id ?? ""}`)?.focus();
              return;
            }
            toast.add({ title: `${provider.name} connected`, type: "success" });
            void navigate({ to: "/settings", hash: "calendars" });
          }}
        >
          <KmIcon name="check" />
          <span>Done</span>
        </Button>
      </div>
    </>
  );
}

function OAuthFlow({
  provider,
  email,
}: {
  readonly provider: CalendarProvider;
  readonly email: string;
}) {
  const [phase, setPhase] = useState<Phase>("consent");
  const later = useLater();
  const headingId = useId();
  const current = PHASE_STEP[phase];
  useEffect(() => {
    if (phase === "connecting") later(1700, () => setPhase("pick"));
  }, [phase, later]);
  const title =
    phase === "cancelled"
      ? "Connection cancelled"
      : phase === "connecting"
        ? "Connecting…"
        : phase === "pick"
          ? "Connected — choose calendars"
          : `Know Meet wants to access your ${provider.shortName} account`;
  return (
    <>
      <SettingsHead
        section="calendar-connect"
        title={`Connect ${provider.name}`}
        parent={["Calendars", "calendars"]}
      />
      <Stepper aria-label="Connection steps">
        {STEP_LABELS.map((label, i) => (
          <StepperItem
            key={label}
            n={i + 1}
            state={i < current ? "done" : i === current ? "current" : "upcoming"}
          >
            {label}
          </StepperItem>
        ))}
      </Stepper>
      <PanelSurface aria-labelledby={headingId} className="w-[min(100%,520px)]">
        {phase === "consent" ? (
          <>
            <div className="flex items-center gap-s2">
              <ProviderMark mark={provider.mark} />
              <div className="grid min-w-0 gap-s2">
                <h2 id={headingId} className="text-lg">
                  {title}
                </h2>
                <span className="truncate text-sm text-muted-foreground" title={email}>
                  {email}
                </span>
              </div>
            </div>
            <div>
              <Permission icon="eye" title="See your events">
                Read events in the calendars you choose, to show upcoming meetings and avoid
                conflicts.
              </Permission>
              <Permission icon="calendar" title="Create events with a KnowMe link">
                Add meetings you schedule in KnowMe, with the join link, dial-in number and PIN.
              </Permission>
            </div>
            <p className="text-sm text-muted-foreground">
              KnowMe never deletes events, and never reads your email or contacts. You can
              disconnect at any time.
            </p>
            <div className="flex flex-wrap items-center gap-s2">
              <Button onClick={() => setPhase("connecting")}>Continue</Button>
              <Button variant="secondary" onClick={() => setPhase("cancelled")}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <h2 id={headingId} className="text-lg">
            {title}
          </h2>
        )}
        {phase === "connecting" ? (
          <p role="status" className="flex items-center gap-s2 text-muted-foreground">
            <KmIcon
              name="refresh"
              className="animate-spin [animation-duration:var(--anim-spin)] motion-reduce:animate-none"
            />
            <span>Finishing sign-in with {provider.name} and reading your calendar list.</span>
          </p>
        ) : null}
        {phase === "pick" ? <PickCalendars provider={provider} email={email} /> : null}
        {phase === "cancelled" ? (
          <>
            <Note kind="err" icon="x">
              You cancelled on the {provider.shortName} consent screen, so KnowMe has no access to
              your calendar. Nothing was changed.
            </Note>
            <div className="flex flex-wrap items-center gap-s2">
              <Button onClick={() => setPhase("consent")}>
                <KmIcon name="refresh" />
                <span>Try again</span>
              </Button>
              <SettingsLink hash="calendars" className={linkButton("secondary")}>
                Back to calendars
              </SettingsLink>
            </div>
          </>
        ) : null}
      </PanelSurface>
    </>
  );
}

function UnknownProvider({ arg }: { readonly arg: string | null }) {
  return (
    <>
      <SettingsHead
        section="calendar-connect"
        title="Calendar provider not found"
        parent={["Calendars", "calendars"]}
      />
      <Empty>
        <EmptyMedia variant="icon">
          <KmIcon name="alert" />
        </EmptyMedia>
        <p>
          There is no calendar provider called <code>{arg ?? "(none)"}</code>. Choose Google,
          Microsoft 365 or CalDAV.
        </p>
        <SettingsLink
          hash="calendars"
          className={cn(buttonVariants({ size: "sm" }), focusFillClass)}
        >
          Back to calendars
        </SettingsLink>
      </Empty>
    </>
  );
}

export function CalendarConnectSection({
  arg,
  user,
}: {
  readonly arg: string | null;
  readonly user: SessionUserView;
}) {
  if (!isCalendarProvider(arg)) return <UnknownProvider arg={arg} />;
  if (arg === "caldav") return <CalDavSection />;
  return <OAuthFlow key={arg} provider={CALENDAR_PROVIDERS[arg]} email={user.email} />;
}
