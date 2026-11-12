// TJ-ARCH-MOB-001 compliant
// settings.html `#telnyx-sms`: a scope note, then one of three states — not
// connected (empty state with Connect), the connect form, or connected (masked
// key tail, profile, sender, webhook, last test, disconnect) — plus opt-outs.
import { Button } from "@know-meet/ui/components/button";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@know-meet/ui/components/empty";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { toast } from "@know-meet/ui/components/toast";
import { useId, useState } from "react";
import { MESSAGING_WEBHOOK } from "../application/settings-fixtures";
import { ConfirmDialog, type ConfirmRequest } from "./confirm-dialog";
import { KeyValue, KeyValueList, Masked, Note, Panel, Stack, StatusChip } from "./settings-parts";
import { SettingsHead } from "./settings-shell";
import { SmsConnectForm, type SmsConnection } from "./sms-connect-form";
import { SmsTester } from "./sms-tester";

export function TelnyxScopeNote() {
  return (
    <Note kind="info" icon="info">
      Telnyx is used only for SMS (invites and summary links) and inbound voice dial-in. Meeting
      audio and video always run on LiveKit.
    </Note>
  );
}

function OptOutPanel() {
  return (
    <Panel title="Opt-outs">
      <Stack gap="sm" className="text-sm">
        <p>
          Recipients can reply <code>STOP</code>, <code>UNSUBSCRIBE</code>, <code>CANCEL</code>,{" "}
          <code>END</code> or <code>QUIT</code> to opt out. Telnyx blocks further messages to that
          number from your profile, and KnowMe stops texting them and falls back to email.
        </p>
        <p className="text-muted-foreground">
          Every message KnowMe sends ends with “Reply STOP to opt out.” HELP replies return your
          organisation name and a support contact.
        </p>
      </Stack>
    </Panel>
  );
}

function NotConnected({ onConnect }: { readonly onConnect: () => void }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <Empty>
        <EmptyMedia variant="icon">
          <KmIcon name="sms" />
        </EmptyMedia>
        <EmptyTitle id={headingId} render={(headingProps) => <h2 {...headingProps} />}>
          Not connected
        </EmptyTitle>
        <EmptyDescription>
          Connect a Telnyx account to text meeting invites and summary links. Without it, KnowMe
          sends everything by email only.
        </EmptyDescription>
        <Button onClick={onConnect}>
          <KmIcon name="plus" />
          <span>Connect Telnyx</span>
        </Button>
      </Empty>
    </section>
  );
}

function Connected({
  connection,
  onDisconnect,
}: {
  readonly connection: SmsConnection;
  readonly onDisconnect: () => void;
}) {
  const [lastTest, setLastTest] = useState(connection.lastTest);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const last =
    lastTest === null
      ? "No test sent yet"
      : `${lastTest.ok ? "Delivered to " : "Failed to "}${lastTest.to} · ${lastTest.at}`;
  return (
    <>
      <Panel title="Connected" trail={<StatusChip tone="green">Active</StatusChip>}>
        <Stack>
          <KeyValueList>
            <KeyValue label="Status" plain="plain">
              <StatusChip tone="green">Connected</StatusChip>
            </KeyValue>
            <KeyValue label="API key">
              <Masked
                label={`API key ending in ${connection.keyLast4}`}
              >{`KEY••••••••••••${connection.keyLast4}`}</Masked>
            </KeyValue>
            <KeyValue label="Messaging profile" plain="plain">
              {connection.profile}
            </KeyValue>
            <KeyValue label="Sender number">{connection.number}</KeyValue>
            <KeyValue label="Delivery receipts" plain="plain">
              {connection.receipts ? "Sent to KnowMe" : "Off"}
            </KeyValue>
            <KeyValue label="Webhook URL">{MESSAGING_WEBHOOK}</KeyValue>
            <KeyValue label="Last test" plain="plain">
              {last}
            </KeyValue>
          </KeyValueList>
          <div className="flex flex-wrap items-center gap-s2">
            <Button
              variant="destructive"
              onClick={() =>
                setConfirm({
                  title: "Disconnect Telnyx SMS?",
                  body: "KnowMe will stop sending SMS invites and summary links. Email delivery keeps working. Your API key is deleted from KnowMe.",
                  confirmLabel: "Disconnect",
                  tone: "danger",
                  onConfirm: () => {
                    toast.add({ title: "Telnyx SMS disconnected", type: "success" });
                    onDisconnect();
                  },
                })
              }
            >
              Disconnect
            </Button>
          </div>
        </Stack>
      </Panel>
      <Panel title="Send a test SMS" description="Uses your sender number and messaging profile.">
        <SmsTester idPrefix="connected" onResult={setLastTest} />
      </Panel>
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

export function TelnyxSmsSection() {
  const [connection, setConnection] = useState<SmsConnection | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  return (
    <>
      <SettingsHead
        section="telnyx-sms"
        title="Telnyx SMS"
        description="Telnyx Messaging sends SMS invites and summary links to participants with a phone number."
      />
      <TelnyxScopeNote />
      {connection !== null ? (
        <>
          <Connected connection={connection} onDisconnect={() => setConnection(null)} />
          <OptOutPanel />
        </>
      ) : formOpen ? (
        <>
          <SmsConnectForm
            onConnected={(next) => {
              setConnection(next);
              setFormOpen(false);
            }}
            onCancel={() => setFormOpen(false)}
          />
          <OptOutPanel />
        </>
      ) : (
        <NotConnected onConnect={() => setFormOpen(true)} />
      )}
    </>
  );
}
