// TJ-ARCH-MOB-001 compliant
// dashboard.html `renderNotFound`: an unknown or cancelled meeting id. Names the
// likely cause, then the way back.
import { buttonVariants } from "@know-meet/ui/components/button";
import { Empty, EmptyHeader, EmptyMedia } from "@know-meet/ui/components/empty";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { PageHead, PageHeadText, PageTitle } from "@know-meet/ui/components/page-head";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useDocumentTitle } from "../../shared/use-document-title";
import { MeetingsCrumbs } from "./dashboard-parts";

export function NotFoundView({ id }: { readonly id: string | null }) {
  useDocumentTitle("Meeting not found · Know Meet");
  const shown = (id ?? "").slice(0, 60) || "(none)";
  return (
    <>
      <PageHead>
        <PageHeadText>
          <MeetingsCrumbs label="Not found" />
          <PageTitle>Meeting not found</PageTitle>
        </PageHeadText>
      </PageHead>
      <Empty role="region" aria-labelledby="nf-title">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <KmIcon name="search" />
          </EmptyMedia>
          <h2 id="nf-title" className="text-lg">
            We couldn’t find that meeting
          </h2>
          <p className="max-w-measure-empty text-sm text-muted-foreground">
            There is no meeting with the id <code>{shown}</code>. It may have been cancelled, or the
            link was copied incompletely.
          </p>
        </EmptyHeader>
        <div className="flex flex-wrap items-center gap-s2">
          <Link to="/dashboard" hash="upcoming" className={cn(buttonVariants(), focusFillClass)}>
            Back to meetings
          </Link>
          <Link
            to="/dashboard"
            hash="schedule"
            className={cn(buttonVariants({ variant: "secondary" }), focusFillClass)}
          >
            Schedule a meeting
          </Link>
        </div>
      </Empty>
    </>
  );
}
