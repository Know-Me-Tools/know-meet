// TJ-ARCH-MOB-001 compliant
// c11 task 11.1: the Meetings dashboard (docs/design/prototype/dashboard.html, v2).
// Sub-states are URL hashes (app-state-map.json): #upcoming (default), #schedule
// (and ?edit=<id>), #meeting:<id>, #invites, #empty. Signed out (no km-auth) every
// view renders the sign-in gate. Static data only (sample workspace fixtures).
import { PageHead, PageHeadText, PageSub, PageTitle } from "@know-meet/ui/components/page-head";
import { Toaster } from "@know-meet/ui/components/toast";
import { useLocation } from "@tanstack/react-router";
import { ScreenPage } from "../../shared/screen-page";
import { useSessionUser } from "../../shared/session";
import { SignInGate } from "../../shared/sign-in-gate";
import { useDocumentTitle } from "../../shared/use-document-title";
import { type HashRoute, useHashRoute } from "../../shared/use-hash-route";
import { type DashboardViewKey, GATE_REASON, GATE_TITLES, resolveDashboardView } from "../domain/dashboard";
import { DashboardProvider } from "./dashboard-context";
import { EmptyView } from "./empty-view";
import { InvitesView } from "./invites-view";
import { MeetingView } from "./meeting-view";
import { ScheduleView } from "./schedule-view";
import { UpcomingView } from "./upcoming-view";

function DashboardGate({ view }: { readonly view: DashboardViewKey }) {
  useDocumentTitle("Sign in · Meetings · Know Meet");
  const hash = useLocation({ select: (location) => location.hash });
  return (
    <>
      <PageHead>
        <PageHeadText>
          <PageTitle>Meetings</PageTitle>
          <PageSub>Scheduling, calendars and invites belong to your KnowMe account.</PageSub>
        </PageHeadText>
      </PageHead>
      <SignInGate title={GATE_TITLES[view]} reason={GATE_REASON} next={`dashboard${hash ? `#${hash}` : ""}`} />
    </>
  );
}

function DashboardView({ view, route }: { readonly view: DashboardViewKey; readonly route: HashRoute }) {
  switch (view) {
    case "schedule":
      return <ScheduleView editId={route.params.edit} />;
    case "meeting":
      return <MeetingView id={route.arg} />;
    case "invites":
      return <InvitesView />;
    case "empty":
      return <EmptyView />;
    case "upcoming":
      return <UpcomingView initialFilter={route.params.filter} />;
  }
}

export function DashboardScreen() {
  const user = useSessionUser();
  const route = useHashRoute();
  const view = resolveDashboardView(route.view);
  return (
    <Toaster>
      <ScreenPage>
        {user === null ? (
          <DashboardGate view={view} />
        ) : (
          <DashboardProvider>
            <DashboardView view={view} route={route} />
          </DashboardProvider>
        )}
      </ScreenPage>
    </Toaster>
  );
}
