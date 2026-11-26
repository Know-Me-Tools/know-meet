// TJ-ARCH-MOB-001 compliant
// The live guest room (acceptance R0-R6, R9; wc04): head; the notices row (the device
// error card when a device was refused, the Enable audio prompt while playback is
// blocked); the room body (the participant stage with screen-share tiles, and the room
// side sheet over it); the controls bar. The room acts only through use cases: meeting
// use cases for mic, camera and leave, conferencing use cases for share, chat, audio,
// devices and background effects. The sheet has two panes: Chat (wc04) and Settings, the
// "Audio and video" pane with the device pickers and the Background section (wc05, wc07),
// opened by the Settings control after Chat. Toasts (an unplugged device) stack over it.
// Recording (wc10 task 10.4): the Record control after Share, the recording notice in
// the head while a recording runs anywhere in the room, the requester's waiting note and
// one-time notices in the notices row, and the consent question for everyone else.
import type { RoomSnapshot } from "@know-meet/application";
import type { TrackKind } from "@know-meet/domain";
import { Toaster } from "@know-meet/ui/components/toast";
import type * as React from "react";
import { useState } from "react";
import { ErrorCard } from "../../guest-meeting/error-card";
import { LiveStatus, useAnnouncer } from "../../guest-meeting/live-status";
import type { MeetingServicesView } from "../../guest-meeting/meeting-services";
import { copyJoinLink } from "../../guest-meeting/share-actions";
import { videoProcessorName } from "./background/background-options";
import { ChatControl } from "./chat/chat-control";
import { ChatPanel } from "./chat/chat-panel";
import { useChat } from "./chat/use-chat";
import { DeviceSettingsPane } from "./device-settings/device-settings-pane";
import { SettingsControl } from "./device-settings/settings-control";
import { EnableAudioPrompt } from "./enable-audio-prompt";
import { LocalTranscriptPanel } from "./local-transcript/local-transcript-panel";
import { ConsentPrompt } from "./recording/consent-prompt";
import { RecordControl } from "./recording/record-control";
import { RecordingIndicator } from "./recording/recording-indicator";
import { RecordingNotice } from "./recording/recording-notice";
import { type RecordingUi, useRecordingUi } from "./recording/use-recording-ui";
import { RoomControls } from "./room-controls";
import { RoomHead } from "./room-head";
import { RoomSheet, RoomSheetScrim } from "./room-sheet/room-sheet";
import { useRoomSheet } from "./room-sheet/use-room-sheet";
import { RoomStage } from "./room-stage";
import { useScreenShare } from "./screen-share/use-screen-share";
import { useConferencing } from "./use-conferencing";
import { useLocalMedia } from "./use-local-media";
import { useRoomAnnouncements } from "./use-room-announcements";

/** Who the head's recording notice names: "you" here, the recorder's name elsewhere. */
function recorderName({ recording, nameOf }: RecordingUi): string {
  const { state } = recording;
  return state.status === "remote-recording" ? nameOf(state.recorder) : "you";
}

interface RoomViewProps {
  readonly services: MeetingServicesView;
  readonly snapshot: RoomSnapshot;
  readonly code: string;
  readonly blockedAtJoin: readonly TrackKind[];
  readonly themeControl: React.ReactNode;
  /** Leaves and waits for history to be saved (useLeaveAndSave). */
  readonly onLeave: () => void;
}

export function RoomView({
  services,
  snapshot,
  code,
  blockedAtJoin,
  themeControl,
  onLeave,
}: RoomViewProps) {
  const { room, useCases } = services;
  const { local, remotes, connection } = snapshot;
  const conferencing = useConferencing(services);
  const { message, announce } = useAnnouncer();
  useRoomAnnouncements(snapshot, announce);
  const media = useLocalMedia(useCases, local, blockedAtJoin, announce);
  const share = useScreenShare(conferencing, snapshot.screenShares, snapshot.support, announce);
  const sheet = useRoomSheet("chat");
  const chatOpen = sheet.isOpen("chat");
  const settingsOpen = sheet.isOpen("settings");
  const chat = useChat(conferencing, snapshot.chat, chatOpen, announce);
  const rec = useRecordingUi(snapshot, announce);
  const [startedAt] = useState(() => Date.now());

  const closeSheet = () => {
    chat.markSeen();
    sheet.close();
  };
  const toggleChat = () => {
    chat.markSeen();
    sheet.toggle("chat");
  };

  return (
    <Toaster>
      <div className="grid h-[calc(100dvh-var(--km-titlebar-h,0px))] grid-cols-[minmax(0,1fr)] grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden">
        <RoomHead
          code={code}
          participantCount={(local === null ? 0 : 1) + remotes.length}
          connection={connection}
          themeControl={themeControl}
          recordingIndicator={
            rec.recording.indicatorOn ? <RecordingIndicator recorder={recorderName(rec)} /> : null
          }
        />
        {/* The notices row stays in the grid when empty (no padding, zero height). Hiding
            it would move the body into the `auto` row and the controls into the `1fr`
            row: the sheet shrinks to the tiles and the bar floats (WC-13, 2026-11-20). */}
        <div className="grid gap-s2 px-s5 pb-s2 empty:pb-0 max-bp768:px-s4">
          {media.problem === null ? null : (
            <ErrorCard
              copy={media.problem.copy}
              {...(media.problem.permission ? { testId: "km-state-permission-denied" } : {})}
              className="mx-auto w-[min(100%,760px)]"
            />
          )}
          {snapshot.audioPlayback === "blocked" ? (
            <EnableAudioPrompt conferencing={conferencing} announce={announce} />
          ) : null}
          <RecordingNotice recording={rec.recording} nameOf={rec.nameOf} />
          {services.localTranscript ? (
            <LocalTranscriptPanel services={services.localTranscript} />
          ) : null}
        </div>
        <div className="relative grid min-h-0 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)]">
          <RoomStage
            room={room}
            code={code}
            local={local}
            localProcessor={videoProcessorName(snapshot.backgroundEffect)}
            remotes={remotes}
            shares={snapshot.screenShares}
            sheetOpen={sheet.state.open}
            announce={announce}
          />
          <RoomSheetScrim open={sheet.state.open} onClose={closeSheet} />
          <RoomSheet state={sheet.state} onClose={closeSheet}>
            <ChatPanel
              shown={sheet.state.pane === "chat"}
              active={chatOpen}
              messages={snapshot.chat}
              remotes={remotes}
              chat={chat}
              onClose={closeSheet}
            />
            <DeviceSettingsPane
              room={room}
              snapshot={snapshot}
              conferencing={conferencing}
              announce={announce}
              blockedAtJoin={blockedAtJoin}
              shown={sheet.state.pane === "settings"}
              active={settingsOpen}
              onClose={closeSheet}
            />
          </RoomSheet>
        </div>
        <RoomControls
          startedAt={startedAt}
          micOn={local !== null && !local.microphone.muted}
          cameraOn={local !== null && !local.camera.muted}
          onToggleMic={() => media.toggle("microphone")}
          onToggleCamera={() => media.toggle("camera")}
          share={share}
          recordControl={<RecordControl action={rec.action} onPress={rec.onRecordControl} />}
          panelControls={
            <>
              <ChatControl open={chatOpen} unread={chat.unread} onToggle={toggleChat} />
              <SettingsControl open={settingsOpen} onToggle={() => sheet.toggle("settings")} />
            </>
          }
          onCopyLink={() => copyJoinLink(code, announce)}
          onLeave={onLeave}
        />
        <ConsentPrompt
          prompt={rec.recording.prompt}
          nameOf={rec.nameOf}
          onAnswer={rec.recording.answer}
        />
        <LiveStatus message={message} />
      </div>
    </Toaster>
  );
}
