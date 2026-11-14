// TJ-ARCH-MOB-001 compliant
// `#empty` (recordings.empty): explains the recording pipeline in four steps and
// leads with starting a meeting. Also the "Recording not found" view for an
// unknown or deleted id (cause, then the fix).
import { buttonVariants } from "@know-meet/ui/components/button";
import { Empty, EmptyMedia } from "@know-meet/ui/components/empty";
import { KmIcon, type KmIconName } from "@know-meet/ui/components/km-icon";
import { PageEyebrow, PageHead, PageHeadText, PageTitle } from "@know-meet/ui/components/page-head";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { RecordingsCrumbs } from "./recording-parts";

interface HowStep {
  readonly icon: KmIconName;
  readonly title: string;
  readonly detail: string;
}

const HOW: readonly HowStep[] = [
  {
    icon: "record",
    title: "Recorded as one composite",
    detail:
      "LiveKit Egress records every participant in a single Room Composite layout, after everyone in the room consents.",
  },
  {
    icon: "database",
    title: "Saved to S3-compatible storage",
    detail: "KnowMe-managed by default, or your own bucket.",
  },
  {
    icon: "globe",
    title: "Pinned to IPFS",
    detail: "A post-recording job pins the file and keeps its content ID (CID).",
  },
  {
    icon: "send",
    title: "Summary and transcript sent",
    detail: "Participants get them by email, or an SMS link, when the meeting closes.",
  },
];

export function EmptyRecordingsView() {
  return (
    <>
      <PageHead>
        <PageHeadText>
          <PageEyebrow>Library</PageEyebrow>
          <PageTitle>Recordings</PageTitle>
        </PageHeadText>
      </PageHead>
      <Empty role="region" aria-labelledby="em-h" className="gap-s4">
        <EmptyMedia variant="icon">
          <KmIcon name="film" />
        </EmptyMedia>
        <h2 id="em-h" className="text-xl">
          No recordings yet
        </h2>
        <p className="max-w-measure-empty text-sm text-muted-foreground">
          When you record a meeting you host, it shows up here with its transcript and summary. Here
          is what happens to each recording:
        </p>
        <ol className="m-0 grid list-none gap-s3 p-0">
          {HOW.map((step) => (
            <li key={step.title} className="grid grid-cols-[40px_minmax(0,1fr)] items-start gap-s3">
              <span
                aria-hidden="true"
                className="grid size-10 place-items-center rounded-base bg-muted text-foreground"
              >
                <KmIcon name={step.icon} />
              </span>
              <div>
                <b className="block">{step.title}</b>
                <span className="block text-sm text-muted-foreground">{step.detail}</span>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-s2">
          <Link to="/meet" hash="start" className={cn(buttonVariants(), focusFillClass)}>
            <KmIcon name="cam" />
            <span>Start a meeting</span>
          </Link>
          <Link
            to="/settings"
            hash="recording"
            className={cn(buttonVariants({ variant: "secondary" }), focusFillClass)}
          >
            <KmIcon name="settings" />
            <span>Recording settings</span>
          </Link>
          <Link
            to="/settings"
            hash="storage"
            className={cn(buttonVariants({ variant: "ghost" }), focusFillClass)}
          >
            <KmIcon name="database" />
            <span>Choose storage</span>
          </Link>
        </div>
      </Empty>
    </>
  );
}

export function RecordingNotFoundView({ id }: { readonly id: string }) {
  return (
    <>
      <RecordingsCrumbs
        items={[{ label: "Recordings", hash: "library" }, { label: "Not found" }]}
      />
      <PageHead>
        <PageHeadText>
          <PageTitle>Recording not found</PageTitle>
        </PageHeadText>
      </PageHead>
      <Empty role="region" aria-labelledby="nf-h">
        <EmptyMedia variant="icon">
          <KmIcon name="alert" />
        </EmptyMedia>
        <h2 id="nf-h" className="sr-only">
          Details
        </h2>
        <p className="max-w-measure-empty text-sm text-muted-foreground">
          We couldn’t find a recording with the id{" "}
          <code className="rounded-6 bg-muted px-1.5 py-px font-mono text-[0.88em] [overflow-wrap:anywhere]">
            {id === "" ? "(none)" : id}
          </code>
          . It may have been deleted, or the link may be incomplete.
        </p>
        <div className="flex flex-wrap items-center gap-s2">
          <Link to="/recordings" hash="library" className={cn(buttonVariants(), focusFillClass)}>
            <KmIcon name="film" />
            <span>Back to recordings</span>
          </Link>
        </div>
      </Empty>
    </>
  );
}
