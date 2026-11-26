import { Button } from "@know-meet/ui/components/button";
import { Checkbox } from "@know-meet/ui/components/checkbox";
import { useId, useState, useSyncExternalStore } from "react";
import type {
  LocalTranscriptServices,
  LocalTranscriptState,
} from "../../../guest-meeting/local-transcript-services";
import { PeerTranscriptConsent } from "./peer-transcript-consent";
import { TimedTranscript } from "./timed-transcript";

const statusCopy: Readonly<Record<LocalTranscriptState, string>> = {
  off: "Download the model when you are ready.",
  preparing: "Preparing the model on this device.",
  ready: "Model ready. Ask everyone before listening.",
  "waiting-for-consent": "Waiting for everyone to agree.",
  "waiting-for-audio": "Waiting for a microphone track.",
  capturing: "Transcribing on this device.",
  paused: "Paused. Download the model again if needed, then ask again.",
  unavailable: "On-device transcription is unavailable. Your meeting and recording are unchanged.",
};

const saveCopy = {
  unsaved: "Save before leaving if you want to keep this text.",
  saving: "Saving in this browser…",
  saved: "Saved. Reopen it in History.",
  unconfirmed: "Save could not be verified. Check storage or try again before leaving.",
} as const;

const sizeFormat = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

export function LocalTranscriptPanel({ services }: { readonly services: LocalTranscriptServices }) {
  const view = useSyncExternalStore(services.subscribe, services.getSnapshot, services.getSnapshot);
  const [opened, setOpened] = useState(false);
  const [retention, setRetention] = useState(false);
  const panelId = useId();
  const retentionId = useId();
  const busy =
    view.state === "waiting-for-consent" ||
    view.state === "waiting-for-audio" ||
    view.state === "capturing";
  const canKeep = services.canOfferRetention();
  const downloadSize = sizeFormat.format(services.downloadBytes / 1_000_000);
  const status =
    view.roomReady && !view.localCaptureSupported
      ? "On-device transcription is unavailable in this browser. You can still respond to requests."
      : statusCopy[view.state];

  return (
    <section aria-label="Local transcript" className="mx-auto grid w-[min(100%,760px)] gap-s2">
      {view.peers.map((peer) => (
        <PeerTranscriptConsent key={peer.key} services={services} peer={peer} />
      ))}
      <div className="flex flex-wrap items-center gap-s2">
        <Button
          variant="secondary"
          aria-expanded={opened}
          aria-controls={panelId}
          onClick={() => setOpened((current) => !current)}
        >
          Transcript
        </Button>
        {!opened && busy ? (
          <p role="status" className="text-sm">
            {status}
          </p>
        ) : null}
      </div>
      <div id={panelId} hidden={!opened}>
        {opened ? (
          <div className="grid min-w-0 gap-s2 rounded-lg bg-surface px-s4 py-s3">
            <p className="text-sm">On this device · Only you can see this transcript</p>
            <p role="status" className="text-sm">
              {status}
            </p>
            <div className="flex flex-wrap gap-s2">
              {view.state === "preparing" ? (
                <Button variant="secondary" onClick={services.cancelPrepare}>
                  Cancel download
                </Button>
              ) : busy ? (
                <Button variant="secondary" onClick={services.pause}>
                  Stop transcription
                </Button>
              ) : view.state === "ready" ? (
                <div className="grid gap-s2">
                  {canKeep ? (
                    <label
                      htmlFor={retentionId}
                      className="flex min-h-size-target cursor-pointer items-center gap-s3 text-sm"
                    >
                      <Checkbox
                        id={retentionId}
                        checked={retention}
                        onCheckedChange={(checked) => setRetention(checked === true)}
                      />
                      <span>Ask whether a copy may be saved in this browser</span>
                    </label>
                  ) : null}
                  <Button
                    disabled={!view.roomReady}
                    onClick={() => {
                      void services.request(
                        retention && canKeep ? "may-save-locally" : "ephemeral",
                      );
                    }}
                  >
                    {view.roomSupportsConsent
                      ? "Ask to transcribe"
                      : "Check whether everyone can consent"}
                  </Button>
                </div>
              ) : (
                <Button
                  disabled={!view.roomReady || !view.localCaptureSupported}
                  onClick={() => {
                    void services.prepare();
                  }}
                >
                  Download English model · {downloadSize} MB
                </Button>
              )}
            </div>
            <TimedTranscript
              live
              lines={view.lines}
              omitted={view.omittedLines}
              searchLines={services.searchLive}
            />
            {view.canKeep && canKeep ? (
              <div className="grid gap-s2">
                <Button
                  variant="secondary"
                  disabled={view.saveStatus === "saving" || view.saveStatus === "saved"}
                  onClick={() => {
                    void services.save();
                  }}
                >
                  Save a copy in this browser
                </Button>
                <p role="status" className="text-sm">
                  {saveCopy[view.saveStatus]}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
