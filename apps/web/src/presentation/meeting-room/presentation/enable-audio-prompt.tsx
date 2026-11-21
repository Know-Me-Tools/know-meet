// TJ-ARCH-MOB-001 compliant
// The "Enable audio" prompt (WC-12; wc04 spec case 2). Shown above the stage while the
// browser refuses to play remote audio (snapshot `audioPlayback === "blocked"`): a
// `surface` note with the speaker-off glyph, one line of cause, and the primary button.
// The click handler calls `enableAudio()` first, with nothing awaited before it, so the
// browser sees the click as the user activation that unlocks playback. The prompt goes
// when the snapshot says playback is allowed; if the browser still refuses, the button
// stays and the reason is announced. Its appearance is announced once, politely.
import type { ConferencingUseCases } from "@know-meet/application";
import { Button } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { useEffect } from "react";
import type { Announce } from "../../guest-meeting/live-status";

export const AUDIO_COPY = {
  button: "Enable audio",
  line: "Your browser paused the meeting sound.",
  shown: "Meeting sound is paused. Select Enable audio to hear the others.",
  stillBlocked: "Your browser still blocked the sound. Select Enable audio again.",
  notConnected: "You’re not connected. Wait for the connection to come back, then try again.",
} as const;

interface EnableAudioPromptProps {
  readonly conferencing: ConferencingUseCases;
  readonly announce: Announce;
}

export function EnableAudioPrompt({ conferencing, announce }: EnableAudioPromptProps) {
  useEffect(() => {
    announce(AUDIO_COPY.shown);
  }, [announce]);

  const onEnable = () => {
    const started = conferencing.enableAudio();
    void started.then((result) => {
      if (result.ok) return;
      announce(
        result.error.code === "playback-blocked"
          ? AUDIO_COPY.stillBlocked
          : AUDIO_COPY.notConnected,
      );
    });
  };

  return (
    <div className="mx-auto flex w-[min(100%,760px)] flex-wrap items-center gap-x-s3 gap-y-s2 rounded-base bg-surface px-s4 py-s3 text-foreground">
      <KmIcon name="speaker-off" className="size-5 flex-none text-muted-foreground" />
      <p className="min-w-0 flex-1 text-sm">{AUDIO_COPY.line}</p>
      <Button type="button" onClick={onEnable}>
        <KmIcon name="speaker" />
        {AUDIO_COPY.button}
      </Button>
    </div>
  );
}
