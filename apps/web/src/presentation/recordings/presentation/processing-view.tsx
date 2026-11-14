// TJ-ARCH-MOB-001 compliant
// `#processing:<id>` (recordings.processing.*): the meeting has ended and the
// recording is still finalizing. A labelled progress bar and five pipeline steps
// (state in words, a number/spinner/check tile and a fill bar), then a "Recording
// ready" status note; beside it the notify-me switch and the destination summary.
import { buttonVariants } from "@know-meet/ui/components/button";
import { cardVariants } from "@know-meet/ui/components/card";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import {
  PageEyebrow,
  PageHead,
  PageHeadText,
  PageSub,
  PageTitle,
} from "@know-meet/ui/components/page-head";
import { Switch } from "@know-meet/ui/components/switch";
import { toast } from "@know-meet/ui/components/toast";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { formatMinutes } from "../../workspace/application/format";
import type { Recording } from "../../workspace/domain/workspace";
import { processingSteps } from "../application/recordings-model";
import { detailHash } from "../application/recordings-route";
import { meterTrackClass, Note, RecordingsCrumbs } from "./recording-parts";
import { readProcessingPin, type StepState, usePipelineProgress } from "./use-pipeline-progress";

const TILE: Readonly<Record<StepState, string>> = {
  wait: "bg-muted text-muted-foreground",
  run: "bg-amber-soft text-amber-text",
  ok: "bg-green-soft text-green-text",
};

function StepTile({
  state,
  number,
  pinned,
}: {
  readonly state: StepState;
  readonly number: number;
  readonly pinned: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("grid size-9 place-items-center rounded-round", TILE[state])}
    >
      {state === "wait" ? <span className="font-mono text-13">{number}</span> : null}
      {state === "run" ? (
        <KmIcon
          name="refresh"
          className={cn(
            !pinned &&
              "animate-spin [animation-duration:var(--anim-spin)] motion-reduce:animate-none",
          )}
        />
      ) : null}
      {state === "ok" ? <KmIcon name="check" /> : null}
    </span>
  );
}

export function ProcessingView({
  recording,
  email,
}: {
  readonly recording: Recording;
  readonly email: string;
}) {
  const steps = useMemo(() => processingSteps(recording), [recording]);
  const progress = usePipelineProgress(steps);
  const [notify, setNotify] = useState(true);
  const activeStep = steps[progress.active];
  const overallLabel = progress.complete
    ? "All steps complete"
    : activeStep === undefined
      ? "Starting…"
      : `Step ${progress.active + 1} of ${steps.length}: ${activeStep.title}`;

  // A pinned capture frame is static: no toast.
  const [pinned] = useState(() => readProcessingPin(steps.length) !== null);
  useEffect(() => {
    if (progress.complete && !pinned)
      toast.add({ title: `Recording ready: ${recording.title}`, type: "success" });
  }, [progress.complete, pinned, recording.title]);

  return (
    <>
      <RecordingsCrumbs
        items={[
          { label: "Recordings", hash: "library" },
          { label: recording.title, hash: detailHash(recording.id) },
          { label: "Processing" },
        ]}
      />
      <PageHead>
        <PageHeadText>
          <PageEyebrow>Still finalizing</PageEyebrow>
          <PageTitle>{recording.title}</PageTitle>
          <PageSub>
            The meeting has ended. Your recording is being finalized, stored and pinned. You can
            leave this page — we’ll notify you when it’s ready.
          </PageSub>
        </PageHeadText>
      </PageHead>
      <div className="grid grid-cols-2 items-start gap-s4 max-bp768:grid-cols-[minmax(0,1fr)]">
        <section aria-labelledby="pp-h" className="grid content-start gap-s4">
          <h2 id="pp-h" className="sr-only">
            Pipeline progress
          </h2>
          <div className="grid gap-s2">
            <div
              role="progressbar"
              aria-label="Overall progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percent}
              aria-valuetext={`${progress.percent}% · ${overallLabel}`}
              className={meterTrackClass}
            >
              <span
                className="block h-full rounded-[inherit] bg-ember-btn"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground">{overallLabel}</span>
          </div>
          <ol className="m-0 grid list-none gap-s2 p-0">
            {steps.map((step, index) => {
              const state = progress.steps[index]?.state ?? "wait";
              const fraction = progress.steps[index]?.fraction ?? 0;
              const stateLabel =
                state === "ok" ? step.doneLabel : state === "run" ? "In progress" : "Waiting";
              return (
                <li
                  key={step.title}
                  className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-s3 rounded-base bg-surface px-s4 py-s3 shadow-(--shadow-card) max-bp768:grid-cols-[36px_minmax(0,1fr)]"
                >
                  <StepTile state={state} number={index + 1} pinned={pinned} />
                  <span className="grid min-w-0 gap-0.5">
                    <b className="block">{step.title}</b>
                    <small className="block text-sm text-muted-foreground [overflow-wrap:anywhere]">
                      {step.detail}
                    </small>
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold whitespace-nowrap max-bp768:col-start-2",
                      state === "ok" ? "text-green-text" : "text-muted-foreground",
                    )}
                  >
                    {stateLabel}
                  </span>
                  <span
                    aria-hidden="true"
                    className="col-[2/-1] h-1 overflow-hidden rounded-pill bg-muted"
                  >
                    <span
                      className={cn(
                        "block h-full w-full origin-left",
                        state === "ok" ? "bg-green" : "bg-amber",
                      )}
                      style={{ transform: `scaleX(${fraction})` }}
                    />
                  </span>
                </li>
              );
            })}
          </ol>
          {progress.complete ? (
            <Note kind="ok" icon="check" role="status">
              <div className="grid gap-s2">
                <b>Recording ready</b>
                <span>
                  Stored, pinned to IPFS, and the summary has{" "}
                  {recording.summarySent
                    ? "been sent to participants."
                    : "been held for your review."}
                </span>
                <div className="flex flex-wrap items-center gap-s2">
                  <Link
                    to="/recordings"
                    hash={detailHash(recording.id)}
                    className={cn(buttonVariants({ size: "sm" }), focusFillClass)}
                  >
                    <KmIcon name="play" className="size-4" />
                    <span>Open recording</span>
                  </Link>
                  <Link
                    to="/recordings"
                    hash={detailHash(recording.id, "storage")}
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "sm" }),
                      focusFillClass,
                    )}
                  >
                    <span>View storage details</span>
                  </Link>
                </div>
              </div>
            </Note>
          ) : null}
        </section>
        <aside aria-labelledby="nt-h" className={cardVariants({ variant: "panel" })}>
          <h2 id="nt-h" className="text-lg">
            We’ll notify you
          </h2>
          <label className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-s4 py-s3">
            <span className="grid gap-0.5">
              <b className="block">Email me when it’s ready</b>
              <span className="block truncate text-sm text-muted-foreground" title={email}>
                {email}
              </span>
            </span>
            <Switch
              checked={notify}
              onCheckedChange={(checked) => {
                setNotify(checked);
                toast.add({
                  title: checked ? "We’ll email you when it’s ready" : "Notification turned off",
                  type: "success",
                });
              }}
            />
          </label>
          <dl className="m-0 grid grid-cols-[minmax(120px,max-content)_minmax(0,1fr)] gap-x-s5 gap-y-s2 max-bp768:grid-cols-[minmax(0,1fr)] max-bp768:gap-0.5">
            <dt className="pt-0.5 text-sm text-muted-foreground">Duration</dt>
            <dd className="m-0 text-sm">{formatMinutes(recording.durationMin)}</dd>
            <dt className="pt-0.5 text-sm text-muted-foreground max-bp768:mt-s3">Layout</dt>
            <dd className="m-0 text-sm">
              {recording.layout === "grid" ? "Grid" : "Speaker"} · {recording.format.toUpperCase()}
            </dd>
            <dt className="pt-0.5 text-sm text-muted-foreground max-bp768:mt-s3">Destination</dt>
            <dd className="m-0 font-mono text-13 [overflow-wrap:anywhere]">{recording.bucket}</dd>
          </dl>
          <Link
            to="/recordings"
            hash="library"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), focusFillClass)}
          >
            <KmIcon name="film" className="size-4" />
            <span>Back to recordings</span>
          </Link>
        </aside>
      </div>
    </>
  );
}
