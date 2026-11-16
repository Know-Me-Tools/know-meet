# Release notes: Know Meet on the web

## 2026-11-16: first web release

Know Meet is live at **https://meet.know-me.tools**. Guests can hold real video
meetings in the browser, with no account and no download.

### What you can do

- **Start a meeting** from the home page. You get a meeting code (for example
  `km-4fq-82x`) and a link to share.
- **Join a meeting** by typing the code on the home page or opening the link.
- **Check your devices in the lobby.** You see your camera preview and a microphone
  level, and you can turn either off before you join. Enter the name others will see.
- **Meet.** Video tiles for everyone, mute, camera on or off, copy the join link,
  and leave. Leaving the page also leaves the meeting.
- **Light and dark themes**, a phone-to-desktop layout, keyboard use, and reduced
  motion when your system asks for it.

### What is not in this release

These are the product direction and appear in the prototype with sample data, but
the live site does not have them yet:

- sign-in and accounts;
- dots, registered agents and the Concierge;
- transcription, recording, and the summary sent at close;
- scheduling, calendar connections, SMS and phone dial-in;
- the desktop (Tauri) and mobile (Flutter) apps.

### Limits you may notice

- **Starting meetings is limited per network address:** about 3 new meetings every
  10 minutes, and at most 5 meetings at a time whose codes are still live. Everyone
  behind one shared address (an office or a mobile carrier) shares that limit. The
  message says "Wait a minute", but the real wait can be several minutes.
- **A meeting code nobody joins expires after 15 minutes.** Once someone has joined,
  the code stays valid for 24 hours.
- **The LiveKit project is on the free Build plan.** Its monthly allowance is a hard
  cap: if it runs out, new meetings cannot connect until the next billing period.
- **A browser may block remote audio** until you interact with the page. There is no
  "Enable audio" prompt yet.

### How it was checked

The release ran once through the full boundary checks on the tested commit
`bb399985`, then again at the public URL:

| Scenario | Where | Result |
|---|---|---|
| WR-1 Two guests see and hear each other; Back leaves the meeting | packaged and https://meet.know-me.tools | pass |
| WR-2 Deep links and reloads return the app | packaged and public URL | pass |
| WR-3 Production certificate, HTTPS redirect, security headers | public URL (control: packaged) | pass |
| WR-4 The token endpoint limits abuse | packaged, plus token service tests | pass |
| WR-5 Only home, join and the meeting room are reachable | packaged and public URL | pass |
| WR-6 No secret in the bundle, images or manifests | artifact scan, 0 findings | pass |
| WR-7 The running images are the ones the workflow built | cluster | pass |
| WR-8 The three screens are accessible (axe, contrast, keyboard, motion) | packaged | pass |

Security, code and UI reviews each found blocking issues; all were fixed and
re-checked before release.

### Known risks, accepted for this release

- NetworkPolicies are in place but not enforced on this cluster, whose network-policy
  add-on is off. Another workload on the shared cluster can reach the token service
  directly.
- `main` has no branch protection, and every push to `main` is deployed. The Argo CD
  Application uses the `default` project.
- A large pool of addresses could still use up meeting creation for everyone.
- Placeholder text in the fields sits at the 4.5:1 contrast minimum.

### Deployment

Images: `ghcr.io/know-me-tools/know-meet-web` and
`ghcr.io/know-me-tools/know-meet-token-service`, first released at tag
`8d4c47f6ebb224ae97ced15546f40f7523c180b2`. From now on, each push to `main` that
changes the app is built, scanned, pinned and synced by Argo CD automatically. See
the [runbook](web-release-runbook.md) and the
[operations guide](web-release-operations.md).
