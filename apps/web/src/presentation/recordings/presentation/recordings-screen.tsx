// TJ-ARCH-MOB-001 compliant
// c11 11.3 Recordings (docs/design/prototype/recordings.html, reference v2).
// Route `/recordings`; sub-states in the hash (app-state-map.json):
//   #library (default) · #empty · #detail:<id>[:transcript|summary|delivery|storage]
//   · #processing:<id> · signed-out gate when km-auth is absent.
// Static only: data comes from the sample workspace and recording fixtures (no
// network); the player, downloads, resends and deletes are simulated.
import { PageEyebrow, PageHead, PageHeadText, PageTitle } from "@know-meet/ui/components/page-head";
import { Toaster } from "@know-meet/ui/components/toast";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ScreenPage } from "../../shared/screen-page";
import { useSessionUser } from "../../shared/session";
import { SignInGate } from "../../shared/sign-in-gate";
import { useDocumentTitle } from "../../shared/use-document-title";
import { useHashRoute } from "../../shared/use-hash-route";
import { useSampleWorkspace } from "../../workspace/use-workspace";
import type { Recording, Workspace } from "../../workspace/domain/workspace";
import type { RecordingsView } from "../domain/recording-details";
import { RECORDING_META } from "../application/recording-fixtures";
import { resolveRecordingsView, tabLabel } from "../application/recordings-route";
import { DetailView } from "./detail-view";
import { EmptyRecordingsView, RecordingNotFoundView } from "./empty-views";
import { LibraryView } from "./library-view";
import { ProcessingView } from "./processing-view";

function titleFor(view: RecordingsView, recording: Recording | null): string {
  if (view.kind === "detail" && recording !== null) return `${recording.title} — ${tabLabel(view.tab)}`;
  if (view.kind === "processing" && recording !== null) return `Processing — ${recording.title}`;
  if (view.kind === "detail" || view.kind === "processing") return "Recording not found";
  return "Recordings";
}

function SignedOutRecordings({ next }: { readonly next: string }) {
  return (
    <>
      <PageHead>
        <PageHeadText>
          <PageEyebrow>Recordings</PageEyebrow>
          <PageTitle>Your recordings</PageTitle>
        </PageHeadText>
      </PageHead>
      <SignInGate
        title="Sign in to see your recordings"
        reason="Recordings, transcripts and summaries are saved to your account. Guest meetings are never recorded, and their live transcript is deleted when the meeting ends."
        next={next}
      />
    </>
  );
}

function SignedInRecordings({
  view,
  workspace,
  email,
  onDeleted,
}: {
  readonly view: RecordingsView;
  readonly workspace: Workspace;
  readonly email: string;
  readonly onDeleted: (id: string) => void;
}) {
  if (view.kind === "empty" || (view.kind === "library" && workspace.recordings.length === 0)) {
    return <EmptyRecordingsView />;
  }
  if (view.kind === "library") return <LibraryView workspace={workspace} />;
  const recording = workspace.recordings.find((r) => r.id === view.id) ?? null;
  const meta = recording === null ? undefined : RECORDING_META[recording.id];
  if (recording === null || meta === undefined) return <RecordingNotFoundView id={view.id} />;
  if (view.kind === "processing") return <ProcessingView key={recording.id} recording={recording} email={email} />;
  return <DetailView key={recording.id} workspace={workspace} recording={recording} meta={meta} tab={view.tab} onDeleted={onDeleted} />;
}

export function RecordingsScreen() {
  const user = useSessionUser();
  const route = useHashRoute();
  const navigate = useNavigate();
  const hash = useLocation({ select: (location) => location.hash });
  const { workspace: sample } = useSampleWorkspace();
  const [deleted, setDeleted] = useState<ReadonlySet<string>>(() => new Set());
  const workspace: Workspace =
    deleted.size === 0 ? sample : { ...sample, recordings: sample.recordings.filter((r) => !deleted.has(r.id)) };
  const view = resolveRecordingsView(route.view, route.arg);
  const recording = view.kind === "detail" || view.kind === "processing"
    ? (workspace.recordings.find((r) => r.id === view.id) ?? null)
    : null;
  const signedIn = user !== null;
  useDocumentTitle(`${signedIn ? titleFor(view, recording) : "Recordings"} · Know Meet`);

  const onDeleted = (id: string) => {
    setDeleted((current) => new Set(current).add(id));
    void navigate({ to: "/recordings", hash: "library" });
  };

  return (
    <Toaster>
      <ScreenPage>
        {signedIn ? (
          <SignedInRecordings view={view} workspace={workspace} email={user.email} onDeleted={onDeleted} />
        ) : (
          <SignedOutRecordings next={hash === "" ? "recordings" : `recordings#${hash}`} />
        )}
      </ScreenPage>
    </Toaster>
  );
}
