// TJ-ARCH-MOB-001 compliant
// c11 task 11.4: the settings screen (docs/design/prototype/settings.html).
// Sub-states are URL hashes (`/settings#livekit`, `#calendar-connect:google`,
// app-state-map.json); unknown hashes fall back to Account. Signed out (no
// km-auth) renders the sign-in gate. Static only: every save, test and connect
// resolves locally; no secret values ever reach the browser.
import { PageEyebrow, PageHead, PageHeadText, PageTitle } from "@know-meet/ui/components/page-head";
import { Toaster } from "@know-meet/ui/components/toast";
import { ScreenPage } from "../../shared/screen-page";
import { type SessionUserView, useSessionUser } from "../../shared/session";
import { SignInGate } from "../../shared/sign-in-gate";
import { useDocumentTitle } from "../../shared/use-document-title";
import { type HashRoute, useHashRoute } from "../../shared/use-hash-route";
import { useSampleWorkspace } from "../../workspace/use-workspace";
import { resolveSection } from "../application/settings-nav";
import { AccountSection } from "./account-section";
import { CalendarConnectSection } from "./calendar-connect-section";
import { CalendarsSection } from "./calendars-section";
import { DeliverySection } from "./delivery-section";
import { LiveKitSection } from "./livekit-section";
import { NotificationsSection } from "./notifications-section";
import { RecordingSection } from "./recording-section";
import { SettingsLayout } from "./settings-shell";
import { StorageIpfsSection } from "./storage-ipfs-section";
import { StorageS3Section } from "./storage-s3-section";
import { StorageSection } from "./storage-section";
import { StorageTestFailedSection } from "./storage-test-failed-section";
import { TelnyxSmsSection } from "./telnyx-sms-section";
import { TelnyxVoiceSection } from "./telnyx-voice-section";
import { TemplatesSection } from "./templates-section";

function SettingsGate({ hash }: { readonly hash: string }) {
  useDocumentTitle("Settings · Know Meet");
  return (
    <>
      <PageHead>
        <PageHeadText>
          <PageEyebrow>Settings</PageEyebrow>
          <PageTitle>Settings</PageTitle>
        </PageHeadText>
      </PageHead>
      <SignInGate
        title="Sign in to manage settings"
        reason="LiveKit, Telnyx, calendars, storage and delivery settings belong to your account. Guests can still start a meeting with the Concierge."
        next={`settings${hash === "" ? "" : `#${hash}`}`}
      />
    </>
  );
}

function SectionView({
  route,
  user,
}: {
  readonly route: HashRoute;
  readonly user: SessionUserView;
}) {
  const { workspace } = useSampleWorkspace();
  const section = resolveSection(route.view);
  switch (section) {
    case "account":
      return <AccountSection user={user} />;
    case "notifications":
      return <NotificationsSection />;
    case "livekit":
      return <LiveKitSection workspace={workspace} />;
    case "telnyx-sms":
      return <TelnyxSmsSection />;
    case "telnyx-voice":
      return <TelnyxVoiceSection workspace={workspace} />;
    case "calendars":
      return <CalendarsSection user={user} />;
    case "calendar-connect":
      return <CalendarConnectSection arg={route.arg} user={user} />;
    case "storage":
      return <StorageSection />;
    case "storage-s3":
      return <StorageS3Section />;
    case "storage-ipfs":
      return <StorageIpfsSection />;
    case "storage-test-failed":
      return <StorageTestFailedSection />;
    case "recording":
      return <RecordingSection />;
    case "delivery":
      return <DeliverySection />;
    case "templates":
      return <TemplatesSection workspace={workspace} userName={user.name} />;
  }
}

export function SettingsScreen() {
  const user = useSessionUser();
  const route = useHashRoute();
  const rawHash = `${route.view}${route.arg === null ? "" : `:${route.arg}`}`;
  return (
    <Toaster>
      <ScreenPage>
        {user === null ? (
          <SettingsGate hash={rawHash} />
        ) : (
          <SettingsLayout section={resolveSection(route.view)}>
            {/* Keyed by the full hash so each view starts from its own static state, like a prototype re-render. */}
            <SectionView key={rawHash} route={route} user={user} />
          </SettingsLayout>
        )}
      </ScreenPage>
    </Toaster>
  );
}
