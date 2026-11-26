import { Button } from "@know-meet/ui/components/button";
import { useState } from "react";
import type {
  LocalTranscriptPeer,
  LocalTranscriptServices,
} from "../../../guest-meeting/local-transcript-services";

export function PeerTranscriptConsent({
  services,
  peer,
}: {
  readonly services: LocalTranscriptServices;
  readonly peer: LocalTranscriptPeer;
}) {
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  async function answer(response: "allow" | "decline" | "withdraw") {
    setBusy(true);
    setError(false);
    try {
      if (!(await services.answer(peer.key, response))) setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-s2 rounded-lg bg-surface px-s4 py-s3">
      {peer.state === "pending" ? (
        <>
          <p className="text-sm">
            <strong>{peer.displayName}</strong> is asking to turn your speech into text on their
            device.
            {peer.retention === "ephemeral"
              ? " They will not save it after the meeting."
              : " They may save it in that browser."}{" "}
            This is separate from recording. You can withdraw permission.
          </p>
          <div className="flex flex-wrap gap-s2">
            <Button
              disabled={busy}
              variant="secondary"
              onClick={() => {
                void answer("decline");
              }}
            >
              Decline
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                void answer("allow");
              }}
            >
              Allow local transcription
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-s2">
          <p className="text-sm" role="status">
            <strong>{peer.displayName}</strong>
            {peer.state === "running"
              ? " is transcribing locally."
              : peer.state === "withdrawing"
                ? ": Withdrawal sent. Waiting for confirmation. To stop sending audio now, you can leave the meeting."
                : " has your permission for this request."}
          </p>
          <Button
            disabled={busy}
            variant="secondary"
            onClick={() => {
              void answer("withdraw");
            }}
          >
            {peer.state === "withdrawing" ? "Retry withdrawal" : "Withdraw permission"}
          </Button>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-sm">
          Could not send the permission change. Try again.
        </p>
      ) : null}
    </div>
  );
}
