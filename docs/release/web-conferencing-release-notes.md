# Release notes: conferencing features on the web

## 2026-11-21: screen share, chat, effects, devices, local history and recordings

Live at **https://meet.know-me.tools** from merge `8eb98147`. Still guests only: no
account, no download. The [first release notes](web-release-notes.md) describe
starting and joining meetings.

### What you can do

- **Share your screen.** Share a screen, a window or a tab with everyone, and stop
  sharing. Others see it in its own tile.
- **Chat.** Send a message to everyone, or privately to one person. Private messages
  show only to you and the person you chose.
- **Change your background.** Blur it or replace it with an image, and turn it off
  again. The first time, the effects section says "Preparing background effects…"
  while it gets ready. In a browser without graphics acceleration, effects are
  reported as not available and your camera works normally.
- **Choose your devices.** Pick the microphone, camera and speaker, with a level
  meter and a preview, in the lobby and during the meeting. Where the browser cannot
  change the speaker, the setting says so.
- **Enable audio.** When the browser blocks sound until you interact with the page,
  an "Enable audio" prompt appears.
- **Keep a history on this device.** Each meeting you join is kept in your browser:
  when it started and ended, who was there, and the chat you sent and received.
  It is stored with PGlite in the browser's IndexedDB and never leaves the device.
  You can open a past meeting and delete it. After Leave, the end screen shows
  "Saving this meeting to your history on this device…" until it is saved.
- **Record in your browser.** Ask to record; everyone in the meeting is asked to
  agree, and a refusal, including from someone who joins later, stops it. The
  recording is made by your browser and kept in its storage (the Recordings page),
  so it costs nothing on the server. It is not LiveKit Egress.

### What is not in this release

Sign-in and accounts; dots, registered agents and the Concierge; transcription;
server-side recording and the summary sent at close; scheduling, calendars, SMS and
phone dial-in; the desktop (Tauri) and mobile (Flutter) apps.

### Limits you may notice

- History and recordings live in one browser on one device. Clearing site data,
  a private window, or another browser starts empty.
- If you reload or close the tab while "Saving this meeting…" is shown, the last
  messages or the end time may be lost.
- A recording stopped within about a second may be saved as an empty file.
- Background effects need graphics acceleration; they download a segmentation model
  from this site the first time.
- Meeting creation limits from the first release still apply (about 3 new meetings
  every 10 minutes per network address).

### How it was checked

Each scenario ran end to end through the built images, then at the public URL.

| Scenario | Where | Result |
|---|---|---|
| WC-1 Screen share reaches others and stops | public URL (Chromium) | pass |
| WC-2 A message to everyone reaches everyone | public URL (Chromium, WebKit, Firefox) | pass |
| WC-3 A private message reaches only its recipient | public URL (Chromium, WebKit, Firefox) | pass |
| WC-4 Blur and image show remotely; software graphics report "not available" | public URL (GPU and software Chromium) | pass |
| WC-5 Microphone and camera choice | public URL (Chromium) | pass |
| WC-6 Speaker choice, or an explanation where unsupported | packaged | pass |
| WC-7 History survives a reload and never leaves the device | public URL (Chromium, WebKit, Firefox) | pass |
| WC-8 Local recording with consent | public URL (Chromium) | pass |
| WC-9 A declined request, including from a late joiner | packaged | pass |
| WC-10 Web security policy widened only for the hosted site | packaged | pass |
| WC-11 Entity graph 5.0.1 and the notes flow | packaged | pass |
| WC-12 "Enable audio" when autoplay is blocked | public URL (Chromium) | pass |
| WC-13 New controls: axe, contrast, keyboard, both themes | packaged | pass |

WC-7 failed at the public URL on the first merged build (`59543ab1`): the other
person's last message and the meeting's end time were lost after Leave and a reload.
It was fixed in `8eb98147` and passed again at the public URL in all three browsers.
WC-1, 4, 5, 8 and 12 were checked at the public URL on `59543ab1`, before that fix.

### Known risks

- The new "Saving this meeting…" line was not covered by the accessibility audit.
- UI review warnings are open: the effects section's busy state, a brief "Preparing"
  flash, the "not available" wording, and missing screenshots of both states.
- Consent for people who join a running recording is an open product decision.
- The Flutter analyze and test CI job fails on golden images, as it did before.
