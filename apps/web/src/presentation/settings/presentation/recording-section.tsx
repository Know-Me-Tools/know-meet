// TJ-ARCH-MOB-001 compliant
// settings.html `#recording`: recording defaults (consent is always on and
// cannot be turned off), transcription options and language, and the fixed
// guest-meeting policy (lock badge "Not editable").
import { Badge } from "@know-meet/ui/components/badge";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { toast } from "@know-meet/ui/components/toast";
import { useId, useState } from "react";
import { SelectField, SwitchRow } from "./settings-fields";
import { Panel, PanelSurface, Stack } from "./settings-parts";
import { SettingsHead } from "./settings-shell";

const LANGUAGES: readonly (readonly [string, string])[] = [
  ["auto", "Detect automatically"],
  ["en-US", "English (US)"],
  ["en-GB", "English (UK)"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["de", "German"],
  ["pt-BR", "Portuguese (Brazil)"],
  ["hi", "Hindi"],
  ["ja", "Japanese"],
];

const DEFAULTS = { auto: true, live: true, speakers: true, kb: true, profanity: false } as const;
type RecordingKey = keyof typeof DEFAULTS;

export function RecordingSection() {
  const [prefs, setPrefs] = useState<Readonly<Record<RecordingKey, boolean>>>(DEFAULTS);
  const [language, setLanguage] = useState("auto");
  const guestHeading = useId();
  const toggle = (key: RecordingKey) => (checked: boolean) => {
    setPrefs((current) => ({ ...current, [key]: checked }));
    toast.add({ title: "Saved", type: "success" });
  };
  return (
    <>
      <SettingsHead
        section="recording"
        title="Recording & transcription"
        description="Defaults for meetings you host. Hosts can still start or stop recording in the room."
      />
      <Panel title="Recording">
        <div>
          <SwitchRow
            label="Auto-record meetings I host"
            description="Starts a Room Composite recording once everyone present has consented."
            checked={prefs.auto}
            onCheckedChange={toggle("auto")}
          />
          <SwitchRow
            label="Ask participants for consent"
            description="Always on. Everyone sees a recording notice and must agree before recording starts; people who join later see it before they enter."
            checked
            disabled
          />
        </div>
      </Panel>
      <Panel title="Transcription">
        <Stack>
          <div>
            <SwitchRow
              label="Live transcription"
              description="Transcribe as people speak and show captions in the room."
              checked={prefs.live}
              onCheckedChange={toggle("live")}
            />
            <SwitchRow
              label="Speaker labels"
              description="Attribute each line to a participant or agent."
              checked={prefs.speakers}
              onCheckedChange={toggle("speakers")}
            />
            <SwitchRow
              label="Add transcript to meeting knowledge in real time"
              description="Every agent in the room, including Concierge, can answer from what has been said so far."
              checked={prefs.kb}
              onCheckedChange={toggle("kb")}
            />
            <SwitchRow
              label="Profanity filter"
              description="Masks profanity in captions, transcripts and summaries."
              checked={prefs.profanity}
              onCheckedChange={toggle("profanity")}
            />
          </div>
          <SelectField
            label="Transcription language"
            value={language}
            options={LANGUAGES}
            onValueChange={(next) => {
              setLanguage(next);
              toast.add({ title: "Language saved", type: "success" });
            }}
          />
        </Stack>
      </Panel>
      <PanelSurface aria-labelledby={guestHeading}>
        <div className="flex flex-wrap items-center justify-between gap-s2">
          <h2 id={guestHeading} className="text-lg">
            Guest meetings
          </h2>
          <Badge variant="locked">
            <KmIcon name="lock" />
            <span>Not editable</span>
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Meetings started by someone who isn’t signed in are never recorded. They get live
          transcription and the Concierge only, and the transcript is deleted when the meeting ends
          — it isn’t saved or sent to anyone.
        </p>
      </PanelSurface>
    </>
  );
}
